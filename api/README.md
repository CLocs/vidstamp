# REFLECT vidstamp API

Optional backend for the vidstamp app. Stores session submissions (role, PGY, timestamps) in SQLite and provides CSV export.

## Endpoints

- **POST /sessions** — Store a submission. Body: `{ "session_id": string, "role": string, "marks": number[], "pgy": number? }`. `session_id` must be unique.
- **GET /export** — Download all sessions as CSV (session_id, role, pgy, timestamps).
- **GET /export/sessions** — List all sessions (session_id, role, pgy, created_at).
- **GET /health** — Health check (no auth).

If `VIDSTAMP_REQUIRE_API_KEY` is set, **POST /sessions**, **GET /export**, and **GET /export/sessions** require the **X-API-Key** header.

## Local run

```bash
cd api
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app:app --reload
```

API: http://127.0.0.1:8000. Docs: http://127.0.0.1:8000/docs.

## Environment variables

| Variable | Description |
|----------|-------------|
| `VIDSTAMP_DB_PATH` | SQLite file path (default: `vidstamp.db`) |
| `VIDSTAMP_REQUIRE_API_KEY` | Set to `1` or `true` to require X-API-Key on protected routes |
| `VIDSTAMP_API_KEY` | Secret key clients must send as `X-API-Key` when required |

## Deploy (e.g. Render)

1. New **Web Service**, connect repo, root directory: `api`.
2. Build: `pip install -r requirements.txt`
3. Start: `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Set env vars: `VIDSTAMP_DB_PATH` (e.g. `/data/vidstamp.db` if using a disk), `VIDSTAMP_REQUIRE_API_KEY`, `VIDSTAMP_API_KEY`.
5. In the frontend, set `VITE_VIDSTAMP_API_URL` to the service URL (e.g. `https://your-app.onrender.com`) and `VITE_VIDSTAMP_API_KEY` if you use API key.
