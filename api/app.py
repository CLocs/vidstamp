"""
REFLECT / vidstamp backend API.
Stores session submissions (role, pgy, timestamps) and provides CSV export.
Auth: JWT issued via POST /auth/login (scope entry | admin); entry JWT for POST /sessions, admin JWT or API key for export/delete.
"""
import json
import os
import sqlite3
import time
from contextlib import asynccontextmanager
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

DB_PATH = os.environ.get("VIDSTAMP_DB_PATH", "vidstamp.db")
REQUIRE_API_KEY = os.environ.get("VIDSTAMP_REQUIRE_API_KEY", "").lower() in ("1", "true", "yes")
API_KEY = os.environ.get("VIDSTAMP_API_KEY", "")

# JWT auth (optional: set these to enable token-based auth)
JWT_SECRET = os.environ.get("VIDSTAMP_JWT_SECRET", "")
ENTRY_PASSWORD_HASH = os.environ.get("VIDSTAMP_ENTRY_PASSWORD_HASH", "")
ADMIN_PASSWORD_HASH = os.environ.get("VIDSTAMP_ADMIN_PASSWORD_HASH", "")
JWT_EXPIRY_SECONDS = 3600  # 1 hour
JWT_ALGORITHM = "HS256"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL,
            pgy INTEGER,
            marks TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()


def _check_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    if not REQUIRE_API_KEY:
        return
    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")


def _verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _create_jwt(scope: str) -> str:
    payload = {"scope": scope, "exp": int(time.time()) + JWT_EXPIRY_SECONDS}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


def _get_bearer_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization[7:].strip()


# ---- JWT auth dependencies ----

def require_entry_jwt(authorization: Optional[str] = Header(None)):
    """Require a valid JWT with scope 'entry' (e.g. for POST /sessions)."""
    if not JWT_SECRET or not ENTRY_PASSWORD_HASH:
        raise HTTPException(status_code=503, detail="JWT auth not configured")
    token = _get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    claims = _decode_jwt(token)
    if not claims or claims.get("scope") != "entry":
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return claims


def require_admin_jwt(authorization: Optional[str] = Header(None)):
    """Require a valid JWT with scope 'admin'."""
    if not JWT_SECRET or not ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=503, detail="JWT auth not configured")
    token = _get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    claims = _decode_jwt(token)
    if not claims or claims.get("scope") != "admin":
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return claims


def require_admin_jwt_or_api_key(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """Allow either valid admin JWT or valid API key (for scripts)."""
    if not JWT_SECRET or not ADMIN_PASSWORD_HASH:
        # Fall back to API key only when JWT not configured
        if REQUIRE_API_KEY and (not API_KEY or x_api_key != API_KEY):
            raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")
        return
    token = _get_bearer_token(authorization)
    if token:
        claims = _decode_jwt(token)
        if claims and claims.get("scope") == "admin":
            return claims
    if API_KEY and x_api_key == API_KEY:
        return
    raise HTTPException(status_code=401, detail="Invalid or missing token or X-API-Key")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="REFLECT vidstamp API", lifespan=lifespan)

# CORS: allow frontend (Cloudflare, localhost) to call the API
_cors_origins = os.environ.get("VIDSTAMP_CORS_ORIGINS", "").strip()
if _cors_origins:
    _origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]
else:
    _origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://reflect-project.dascolin.workers.dev",
    ]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class AuthLoginPayload(BaseModel):
    password: str
    scope: str  # "entry" | "admin"


class SessionPayload(BaseModel):
    session_id: str
    role: str
    marks: list[float]
    pgy: Optional[int] = None


@app.post("/auth/login")
def auth_login(body: AuthLoginPayload):
    """Exchange password for a JWT. scope must be 'entry' or 'admin'."""
    if not JWT_SECRET or (not ENTRY_PASSWORD_HASH and not ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=503, detail="JWT auth not configured")
    scope = (body.scope or "").strip().lower()
    if scope not in ("entry", "admin"):
        raise HTTPException(status_code=400, detail="scope must be 'entry' or 'admin'")
    if scope == "entry":
        if not _verify_password(body.password, ENTRY_PASSWORD_HASH):
            raise HTTPException(status_code=401, detail="Invalid password")
    else:
        if not _verify_password(body.password, ADMIN_PASSWORD_HASH):
            raise HTTPException(status_code=401, detail="Invalid password")
    token = _create_jwt(scope)
    return {"access_token": token, "token_type": "bearer"}


@app.post("/sessions")
def post_session(body: SessionPayload, _: dict = Depends(require_entry_jwt)):
    """Store a session (role, pgy, timestamps). session_id should be unique per submission."""
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO sessions (session_id, role, pgy, marks) VALUES (?, ?, ?, ?)",
            (body.session_id, body.role, body.pgy, json.dumps(body.marks)),
        )
        conn.commit()
        return {"ok": True, "session_id": body.session_id}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="session_id already exists")
    finally:
        conn.close()


@app.get("/export", response_class=PlainTextResponse)
def export_csv(_=Depends(require_admin_jwt_or_api_key)):
    """Export all sessions as CSV (role,pgy,timestamps with one row per timestamp)."""
    import csv
    import io
    conn = get_db()
    rows = conn.execute(
        "SELECT session_id, role, pgy, marks, created_at FROM sessions ORDER BY created_at"
    ).fetchall()
    conn.close()

    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["session_id", "role", "pgy", "timestamps"])
    for r in rows:
        marks = json.loads(r["marks"])
        for i, t in enumerate(marks):
            w.writerow([
                r["session_id"] if i == 0 else "",
                r["role"] if i == 0 else "",
                r["pgy"] if i == 0 else "",
                t,
            ])
    return PlainTextResponse(out.getvalue(), media_type="text/csv")


@app.get("/export/sessions")
def export_sessions_list(_=Depends(require_admin_jwt_or_api_key)):
    """List session_id, role, pgy, created_at, and timestamp count for all sessions."""
    conn = get_db()
    rows = conn.execute(
        "SELECT session_id, role, pgy, marks, created_at FROM sessions ORDER BY created_at"
    ).fetchall()
    conn.close()
    out = []
    for r in rows:
        marks = json.loads(r["marks"]) if r["marks"] else []
        out.append({
            "session_id": r["session_id"],
            "role": r["role"],
            "pgy": r["pgy"],
            "created_at": r["created_at"],
            "timestamp_count": len(marks),
        })
    return out


@app.delete("/sessions")
def clear_all_sessions(_=Depends(require_admin_jwt_or_api_key)):
    """Delete all sessions. Requires API key."""
    conn = get_db()
    conn.execute("DELETE FROM sessions")
    conn.commit()
    conn.close()
    return {"ok": True, "deleted": "all"}


@app.get("/health")
def health():
    return {"status": "ok"}
