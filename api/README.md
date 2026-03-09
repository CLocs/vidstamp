# REFLECT vidstamp API

Optional backend for the vidstamp app. Stores session submissions (role, PGY, timestamps) and provides CSV export. Run it as a **separate hosted service** so the app doesn’t depend on your machine.

## Run as a hosted service (recommended)

Deploy the API to a cloud host so it runs 24/7. The frontend (Cloudflare) will POST to this URL; you view results via the API or by exporting CSV.

**Hosting options:**


| Service     | Free tier                  | Persistent DB                                                                                                 |
| ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Render**  | Yes (spins down when idle) | Add a **Persistent Disk** (paid) and set `VIDSTAMP_DB_PATH` to a path on that disk so data survives restarts. |
| **Railway** | Trial / paid               | Can attach a volume for SQLite, or use Railway Postgres later.                                                |
| **Fly.io**  | Yes                        | Use a **volume** and point `VIDSTAMP_DB_PATH` at the mounted path.                                            |


**Important:** On most PaaS, the app filesystem is **ephemeral** — restarts can wipe the SQLite file. To keep data, use a **persistent disk/volume** and set `VIDSTAMP_DB_PATH` to a path on that storage (e.g. `/data/vidstamp.db`). See each provider’s docs for adding a disk/volume.

## Endpoints

- **POST /auth/login** — Exchange password for a JWT. Body: `{ "password": string, "scope": "entry" | "admin" }`. Returns `{ "access_token": string, "token_type": "bearer" }`. Requires JWT env vars to be set.
- **POST /sessions** — Store a submission. Body: `{ "session_id": string, "role": string, "marks": number[], "pgy": number? }`. Requires **entry JWT** (Bearer token from `/auth/login` with scope `entry`).
- **GET /export** — Download all sessions as CSV. Requires **admin JWT** (Bearer) or **X-API-Key**.
- **GET /export/sessions** — List all sessions (session_id, role, pgy, created_at, timestamp_count). Requires **admin JWT** or **X-API-Key**.
- **DELETE /sessions** — Delete all sessions. Requires **admin JWT** or **X-API-Key**.
- **GET /health** — Health check (no auth).

When **JWT is configured** (see below), **POST /sessions** requires an entry JWT; admin routes accept either an admin JWT or the API key (for scripts).

## Viewing production data (Render)

Your production data lives on Render. You view it by calling the API — **GET /export** (CSV) or **GET /export/sessions** (JSON). You need your **Render service URL** (e.g. `https://vidstamp-api.onrender.com`) and your **API key** (the same value as `VIDSTAMP_API_KEY` in Render’s Environment).

**Where to enter the commands**


| Where                    | How                                                                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminal (curl)**      | Run the curl command below. The CSV is saved to a file; open it in Excel or Sheets.                                                                                                                              |
| **Browser (Swagger UI)** | Open `https://YOUR_RENDER_URL/docs`, find **GET /export** or **GET /export/sessions**, click **Try it out**, add the API key in the **X-API-Key** box, click **Execute**. You can copy the response or download. |
| **Postman / Insomnia**   | New GET request to `https://YOUR_RENDER_URL/export`. In Headers add `X-API-Key` = your key. Send; then save or view the response.                                                                                |


**Commands (replace the placeholders)**

- **YOUR_RENDER_URL** = your Render service URL, e.g. `https://vidstamp-api.onrender.com` (no trailing slash).
- **YOUR_API_KEY** = the value of `VIDSTAMP_API_KEY` from Render’s Environment tab.

**Download all data as CSV (open in Excel/Sheets):**

```bash
curl -o results.csv -H "X-API-Key: YOUR_API_KEY" "https://YOUR_RENDER_URL/export"
```

Then open `results.csv` on your computer. Columns: `session_id`, `role`, `pgy`, `timestamps` (one row per timestamp; role/pgy repeat on the first row of each session).

**List sessions as JSON (overview only):**

```bash
curl -H "X-API-Key: YOUR_API_KEY" "https://YOUR_RENDER_URL/export/sessions"
```

**If /docs or /export returns "Not found" or 404**

- **Render free tier:** The service may be **asleep**. Open **[https://YOUR_RENDER_URL/health](https://YOUR_RENDER_URL/health)** in the browser and wait 30–60 seconds; once it responds with `{"status":"ok"}`, try **/docs** or **/export** again.
- Try **/redoc** as well (FastAPI’s other docs UI): **[https://YOUR_RENDER_URL/redoc](https://YOUR_RENDER_URL/redoc)**.
- If **/health** works but **/docs** still 404s, check the Render **Logs** for the service to see if the app is starting correctly.

**Using the docs page in the browser**

1. Open **[https://YOUR_RENDER_URL/docs](https://YOUR_RENDER_URL/docs)** (e.g. `https://vidstamp-api.onrender.com/docs`). If you see "Not found", wait a minute and retry (service may be waking up), or use **/redoc**.
2. Find **GET /export** or **GET /export/sessions**.
3. Click **Try it out**.
4. In **X-API-Key** (or the header box), enter your API key.
5. Click **Execute**. The response body is the CSV or JSON; you can copy it or use the “Download” link if the UI offers one.

---

## Viewing results (reference)

**Option 1: Download CSV from the API**  
See **Viewing production data (Render)** above for full commands and where to run them.

**Option 2: List sessions (JSON)**  
`GET /export/sessions` returns a JSON array of sessions (session_id, role, pgy, created_at, timestamp_count). Good for a quick overview or building a simple dashboard.

**Option 3: SQLite database viewer**  
The data lives in the SQLite file at `VIDSTAMP_DB_PATH` (default: `vidstamp.db`). You can open it with:

- **[DB Browser for SQLite](https://sqlitebrowser.org/)** — GUI: open the file, browse the `sessions` table, run queries.
- **Command line:** `sqlite3 vidstamp.db` then e.g. `SELECT * FROM sessions;` or `SELECT session_id, role, pgy, marks, created_at FROM sessions;`

**DBeaver (when the API runs locally and `api/vidstamp.db` exists):**

1. **Database** → **New Database Connection** → **SQLite** → **Next**.
2. **Path:** Click **Open...** and select `api/vidstamp.db` (e.g. `C:\Users\dasco\repos\vidstamp\api\vidstamp.db`). **Test connection** → **Finish**.
3. In the left tree: expand the connection → **Tables** → **sessions**. Right‑click **sessions** → **View Data** → **All rows** (or **F4**). Columns: `id`, `session_id`, `role`, `pgy`, `marks` (JSON), `created_at`.
4. **SQL:** Right‑click the connection → **SQL Editor** → **New SQL Script**. Run: `SELECT session_id, role, pgy, created_at, marks FROM sessions ORDER BY created_at DESC;` (Ctrl+Enter to execute).

If the API runs on a remote server (e.g. Render), you don’t have direct file access; use Option 1 or 2. For a local run, Option 3 works on the machine where the API and `vidstamp.db` live.

## Local run

Using **[uv](https://docs.astral.sh/uv/)** (recommended):

```bash
cd api
uv sync
uv run uvicorn app:app --reload
```

Without uv (pip + venv):

```bash
cd api
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app:app --reload
```

API: [http://127.0.0.1:8000](http://127.0.0.1:8000). Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Environment variables


| Variable                       | Description                                                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VIDSTAMP_DB_PATH`             | SQLite file path (default: `vidstamp.db`)                                                                                                           |
| `VIDSTAMP_REQUIRE_API_KEY`     | Set to `1` or `true` to require X-API-Key on admin routes when JWT is not configured                                                                |
| `VIDSTAMP_API_KEY`             | Secret for X-API-Key; accepted on admin routes (export, delete) in addition to admin JWT                                                            |
| `VIDSTAMP_JWT_SECRET`          | **Required for JWT.** Secret used to sign and verify JWTs. Generate with `uv run python generate_jwt_secret.py` (see below). |
| `VIDSTAMP_ENTRY_PASSWORD_HASH` | **Required for JWT.** Bcrypt hash of the study-entry password. Generate with `python generate_password_hash.py "yourpassword"`.                     |
| `VIDSTAMP_ADMIN_PASSWORD_HASH` | **Required for JWT.** Bcrypt hash of the admin (results page) password. Generate with `python generate_password_hash.py "adminpassword"`.           |
| `VIDSTAMP_CORS_ORIGINS`        | Optional. Comma-separated origins allowed to call the API. If unset, defaults include localhost and `https://reflect-project.dascolin.workers.dev`. |


### Generating the JWT secret

From the `api` directory:

```bash
uv run python generate_jwt_secret.py
```

Copy the printed value into Render (and/or `.env`) as `VIDSTAMP_JWT_SECRET`. Keep it secret; do not commit it.

### Generating password hashes (JWT)

From the `api` directory (with uv: `uv sync` first if you haven’t):

```bash
uv run python generate_password_hash.py
```

Or with pip: `pip install -r requirements.txt` then `python generate_password_hash.py`.

This prints a bcrypt hash for the default password `obgyn`. Add it to Render as both `VIDSTAMP_ENTRY_PASSWORD_HASH` and `VIDSTAMP_ADMIN_PASSWORD_HASH` if you use the same password for study entry and admin. To generate a different password (e.g. for admin only):

```bash
uv run python generate_password_hash.py "youradminpassword"
```

Copy the printed hash into the corresponding env var.

## Step-by-step: Deploy to Render

### 1. Create a Render account and connect the repo

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign up or log in (GitHub login is easiest).
2. Click **New +** (top right) → **Web Service**.
3. Connect your GitHub (or GitLab) if you haven’t already. Find the **vidstamp** repo and click **Connect**.

### 2. Configure the Web Service

1. **Name:** e.g. `vidstamp-api` (this becomes part of the URL: `https://vidstamp-api.onrender.com`).
2. **Region:** Pick one close to you or your users.
3. **Branch:** `main` (or the branch you deploy from).
4. **Root Directory:** Click **Add directory** and enter `**api`**. (Render will run all commands from this folder.)
5. **Runtime:** **Python 3**.
6. **Build Command:**
  ```bash
   pip install -r requirements.txt
  ```
7. **Start Command:**
  ```bash
    uvicorn app:app --host 0.0.0.0 --port $PORT
  ```
8. **Instance type:** Free is fine to start (note: free instances spin down after ~15 min of no traffic and take ~30–60 s to wake up).

Click **Create Web Service**. Render will clone the repo, run the build, and start the app. The first deploy may take a few minutes.

### 3. Add environment variables

1. In the service page, go to the **Environment** tab (left sidebar).
2. Click **Add Environment Variable** and add these one by one:

  | Key                            | Value                                                                                                                                                         |
  | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `VIDSTAMP_DB_PATH`             | `/tmp/vidstamp.db` (for now; data may be lost on restart). If you add a Persistent Disk later, change this to e.g. `/data/vidstamp.db`.                       |
  | `VIDSTAMP_JWT_SECRET`          | Run `uv run python generate_jwt_secret.py` in the api folder and paste the output.                                                                           |
  | `VIDSTAMP_ENTRY_PASSWORD_HASH` | Run `python generate_password_hash.py "obgyn"` in the api folder and paste the hash.                                                                          |
  | `VIDSTAMP_ADMIN_PASSWORD_HASH` | Same as entry, or run `python generate_password_hash.py "adminpass"` for a different admin password.                                                          |
  | `VIDSTAMP_REQUIRE_API_KEY`     | `1` (optional; allows X-API-Key for admin routes in addition to JWT)                                                                                          |
  | `VIDSTAMP_API_KEY`             | Optional. Long random string for script/curl (e.g. 32+ characters). You’ll use this in the frontend too. Example: `mySecretKey123ChangeThisToSomethingRandom` |

3. Save. Render will redeploy automatically when you add or change env vars.

### 4. (Optional) Add a Persistent Disk so data survives restarts

1. In the service page, go to **Storage** (left sidebar).
2. Click **Add Disk**.
3. **Name:** e.g. `vidstamp-data`. **Mount Path:** `/data`. **Size:** 1 GB is plenty. Add the disk.
4. Go back to **Environment** and change `VIDSTAMP_DB_PATH` to `**/data/vidstamp.db`**. Save so the service redeploys.

### 5. Get the API URL and test it

1. On the service page, at the top you’ll see **Your service is live at** → e.g. `https://vidstamp-api.onrender.com`. Copy this URL.
2. Open `https://your-service-url.onrender.com/health` in a browser. You should see `{"status":"ok"}`.
3. Open `https://your-service-url.onrender.com/docs` to see the interactive API docs (Swagger UI).

### 6. Point the frontend at the API

1. In **Cloudflare Dashboard** → your frontend project (e.g. reflect-project) → **Settings** → **Environment variables** (or the build configuration).
2. Add (for Production and Preview if you use both):
  - **Variable:** `VITE_VIDSTAMP_API_URL` → **Value:** `https://vidstamp-api.onrender.com` (your actual Render URL, no trailing slash).
    - **Variable:** `VITE_VIDSTAMP_API_KEY` → **Value:** (optional) the same secret as `VIDSTAMP_API_KEY` if you use it for script access.
3. Save and trigger a new frontend deploy (push a commit or **Retry deployment**). The frontend uses **JWT** for auth: users get a token via **POST /auth/login** (study entry and admin results); no password is stored in the client.

