"""
REFLECT / vidstamp backend API.
Stores session submissions (role, pgy, timestamps) and provides CSV export.
"""
import json
import os
import sqlite3
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

DB_PATH = os.environ.get("VIDSTAMP_DB_PATH", "vidstamp.db")
REQUIRE_API_KEY = os.environ.get("VIDSTAMP_REQUIRE_API_KEY", "").lower() in ("1", "true", "yes")
API_KEY = os.environ.get("VIDSTAMP_API_KEY", "")


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
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class SessionPayload(BaseModel):
    session_id: str
    role: str
    marks: list[float]
    pgy: Optional[int] = None


@app.post("/sessions")
def post_session(body: SessionPayload, _: None = Depends(_check_api_key)):
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
def export_csv(_: None = Depends(_check_api_key)):
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
def export_sessions_list(_: None = Depends(_check_api_key)):
    """List session_id and created_at for all sessions."""
    conn = get_db()
    rows = conn.execute(
        "SELECT session_id, role, pgy, created_at FROM sessions ORDER BY created_at"
    ).fetchall()
    conn.close()
    return [
        {
            "session_id": r["session_id"],
            "role": r["role"],
            "pgy": r["pgy"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


@app.get("/health")
def health():
    return {"status": "ok"}
