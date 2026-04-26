"""
REFLECT / vidstamp backend API.
Stores session submissions (role, pgy, timestamps) and provides CSV export.
"""
import json
import os
import sqlite3
from contextlib import asynccontextmanager
from typing import Optional
from urllib.parse import unquote, urlparse

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

DB_PATH = os.environ.get("VIDSTAMP_DB_PATH", "vidstamp.db")
REQUIRE_API_KEY = os.environ.get("VIDSTAMP_REQUIRE_API_KEY", "").lower() in ("1", "true", "yes")
API_KEY = os.environ.get("VIDSTAMP_API_KEY", "")
DEFAULT_VIDEO_URL = os.environ.get(
    "VIDSTAMP_DEFAULT_VIDEO_URL",
    "https://pub-05948a525013432aada6712ce583b048.r2.dev/reflect/Sample_Surgery1_cut1a.mp4",
)


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
            video_name TEXT,
            marks TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    # Backward-compatible migration for existing databases
    cols = [r["name"] for r in conn.execute("PRAGMA table_info(sessions)").fetchall()]
    if "video_name" not in cols:
        conn.execute("ALTER TABLE sessions ADD COLUMN video_name TEXT")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS app_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class SessionPayload(BaseModel):
    session_id: str
    role: str
    marks: list[float]
    pgy: Optional[int] = None
    video_url: Optional[str] = None


class VideoUrlPayload(BaseModel):
    video_url: str


@app.post("/sessions")
def post_session(body: SessionPayload, _: None = Depends(_check_api_key)):
    """Store a session (role, pgy, timestamps). session_id should be unique per submission."""
    parsed_path = urlparse(body.video_url or "").path
    video_name = os.path.basename(unquote(parsed_path)).strip() or None
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO sessions (session_id, role, pgy, video_name, marks) VALUES (?, ?, ?, ?, ?)",
            (body.session_id, body.role, body.pgy, video_name, json.dumps(body.marks)),
        )
        conn.commit()
        return {"ok": True, "session_id": body.session_id, "video_name": video_name}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="session_id already exists")
    finally:
        conn.close()


@app.get("/config/video-url")
def get_video_url():
    """Get global video URL used by participant page."""
    conn = get_db()
    row = conn.execute(
        "SELECT value FROM app_config WHERE key = ?",
        ("video_url",),
    ).fetchone()
    conn.close()
    return {"video_url": row["value"] if row else DEFAULT_VIDEO_URL}


@app.put("/config/video-url")
def set_video_url(body: VideoUrlPayload, _: None = Depends(_check_api_key)):
    """Set global video URL. Requires API key when enabled."""
    video_url = (body.video_url or "").strip()
    if not video_url:
        raise HTTPException(status_code=400, detail="video_url is required")
    conn = get_db()
    conn.execute(
        """
        INSERT INTO app_config (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = datetime('now')
        """,
        ("video_url", video_url),
    )
    conn.commit()
    conn.close()
    return {"ok": True, "video_url": video_url}


@app.delete("/config/video-url")
def reset_video_url(_: None = Depends(_check_api_key)):
    """Reset global video URL to default. Requires API key when enabled."""
    conn = get_db()
    conn.execute("DELETE FROM app_config WHERE key = ?", ("video_url",))
    conn.commit()
    conn.close()
    return {"ok": True, "video_url": DEFAULT_VIDEO_URL}


@app.get("/export", response_class=PlainTextResponse)
def export_csv(_: None = Depends(_check_api_key)):
    """Export all sessions as CSV (role,pgy,timestamps with one row per timestamp)."""
    import csv
    import io
    conn = get_db()
    rows = conn.execute(
        "SELECT session_id, role, pgy, video_name, marks, created_at FROM sessions ORDER BY created_at"
    ).fetchall()
    conn.close()

    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["session_id", "role", "pgy", "video_name", "timestamps"])
    for r in rows:
        marks = json.loads(r["marks"])
        for i, t in enumerate(marks):
            w.writerow([
                r["session_id"] if i == 0 else "",
                r["role"] if i == 0 else "",
                r["pgy"] if i == 0 else "",
                r["video_name"] if i == 0 else "",
                t,
            ])
    return PlainTextResponse(out.getvalue(), media_type="text/csv")


@app.get("/export/sessions")
def export_sessions_list(_: None = Depends(_check_api_key)):
    """List session_id, role, pgy, video_name, created_at, and timestamp count for all sessions."""
    conn = get_db()
    rows = conn.execute(
        "SELECT session_id, role, pgy, video_name, marks, created_at FROM sessions ORDER BY created_at"
    ).fetchall()
    conn.close()
    out = []
    for r in rows:
        marks = json.loads(r["marks"]) if r["marks"] else []
        out.append({
            "session_id": r["session_id"],
            "role": r["role"],
            "pgy": r["pgy"],
            "video_name": r["video_name"],
            "created_at": r["created_at"],
            "timestamp_count": len(marks),
        })
    return out


@app.delete("/sessions")
def clear_all_sessions(_: None = Depends(_check_api_key)):
    """Delete all sessions. Requires API key."""
    conn = get_db()
    conn.execute("DELETE FROM sessions")
    conn.commit()
    conn.close()
    return {"ok": True, "deleted": "all"}


@app.get("/health")
def health():
    return {"status": "ok"}
