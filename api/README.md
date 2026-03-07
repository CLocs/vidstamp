# REFLECT vidstamp API

Optional backend for the vidstamp app. Stores session submissions (role, PGY, timestamps) and provides CSV export. Run it as a **separate hosted service** so the app doesn’t depend on your machine.

## Run as a hosted service (recommended)

Deploy the API to a cloud host so it runs 24/7. The frontend (Cloudflare) will POST to this URL; you view results via the API or by exporting CSV.

**Hosting options:**

| Service   | Free tier | Persistent DB |
|----------|-----------|----------------|
| **Render** | Yes (spins down when idle) | Add a **Persistent Disk** (paid) and set `VIDSTAMP_DB_PATH` to a path on that disk so data survives restarts. |
| **Railway** | Trial / paid | Can attach a volume for SQLite, or use Railway Postgres later. |
| **Fly.io**  | Yes        | Use a **volume** and point `VIDSTAMP_DB_PATH` at the mounted path. |

**Important:** On most PaaS, the app filesystem is **ephemeral** — restarts can wipe the SQLite file. To keep data, use a **persistent disk/volume** and set `VIDSTAMP_DB_PATH` to a path on that storage (e.g. `/data/vidstamp.db`). See each provider’s docs for adding a disk/volume.

## Endpoints

- **POST /sessions** — Store a submission. Body: `{ "session_id": string, "role": string, "marks": number[], "pgy": number? }`. `session_id` must be unique.
- **GET /export** — Download all sessions as CSV (session_id, role, pgy, timestamps).
- **GET /export/sessions** — List all sessions (session_id, role, pgy, created_at).
- **GET /health** — Health check (no auth).

If `VIDSTAMP_REQUIRE_API_KEY` is set, **POST /sessions**, **GET /export**, and **GET /export/sessions** require the **X-API-Key** header.

## Viewing production data (Render)

Your production data lives on Render. You view it by calling the API — **GET /export** (CSV) or **GET /export/sessions** (JSON). You need your **Render service URL** (e.g. `https://vidstamp-api.onrender.com`) and your **API key** (the same value as `VIDSTAMP_API_KEY` in Render’s Environment).

**Where to enter the commands**

| Where | How |
|-------|-----|
| **Terminal (curl)** | Run the curl command below. The CSV is saved to a file; open it in Excel or Sheets. |
| **Browser (Swagger UI)** | Open `https://YOUR_RENDER_URL/docs`, find **GET /export** or **GET /export/sessions**, click **Try it out**, add the API key in the **X-API-Key** box, click **Execute**. You can copy the response or download. |
| **Postman / Insomnia** | New GET request to `https://YOUR_RENDER_URL/export`. In Headers add `X-API-Key` = your key. Send; then save or view the response. |

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

- **Render free tier:** The service may be **asleep**. Open **https://YOUR_RENDER_URL/health** in the browser and wait 30–60 seconds; once it responds with `{"status":"ok"}`, try **/docs** or **/export** again.
- Try **/redoc** as well (FastAPI’s other docs UI): **https://YOUR_RENDER_URL/redoc**.
- If **/health** works but **/docs** still 404s, check the Render **Logs** for the service to see if the app is starting correctly.

**Using the docs page in the browser**

1. Open **https://YOUR_RENDER_URL/docs** (e.g. `https://vidstamp-api.onrender.com/docs`). If you see "Not found", wait a minute and retry (service may be waking up), or use **/redoc**.
2. Find **GET /export** or **GET /export/sessions**.
3. Click **Try it out**.
4. In **X-API-Key** (or the header box), enter your API key.
5. Click **Execute**. The response body is the CSV or JSON; you can copy it or use the “Download” link if the UI offers one.

---

## Viewing results (reference)

**Option 1: Download CSV from the API**  
See **Viewing production data (Render)** above for full commands and where to run them.

**Option 2: List sessions (JSON)**  
`GET /export/sessions` returns a JSON array of sessions (session_id, role, pgy, created_at). Good for a quick overview or building a simple dashboard.

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
| `VIDSTAMP_CORS_ORIGINS` | Optional. Comma-separated origins allowed to call the API (e.g. `https://reflect-project.dascolin.workers.dev`). If unset, defaults include localhost and `https://reflect-project.dascolin.workers.dev`. Add preview URLs if needed. |

## Step-by-step: Deploy to Render

### 1. Create a Render account and connect the repo

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign up or log in (GitHub login is easiest).
2. Click **New +** (top right) → **Web Service**.
3. Connect your GitHub (or GitLab) if you haven’t already. Find the **vidstamp** repo and click **Connect**.

### 2. Configure the Web Service

4. **Name:** e.g. `vidstamp-api` (this becomes part of the URL: `https://vidstamp-api.onrender.com`).
5. **Region:** Pick one close to you or your users.
6. **Branch:** `main` (or the branch you deploy from).
7. **Root Directory:** Click **Add directory** and enter **`api`**. (Render will run all commands from this folder.)
8. **Runtime:** **Python 3**.
9. **Build Command:**  
   ```bash
   pip install -r requirements.txt
   ```
10. **Start Command:**  
    ```bash
    uvicorn app:app --host 0.0.0.0 --port $PORT
    ```
11. **Instance type:** Free is fine to start (note: free instances spin down after ~15 min of no traffic and take ~30–60 s to wake up).

Click **Create Web Service**. Render will clone the repo, run the build, and start the app. The first deploy may take a few minutes.

### 3. Add environment variables

12. In the service page, go to the **Environment** tab (left sidebar).
13. Click **Add Environment Variable** and add these one by one:

    | Key | Value |
    |-----|--------|
    | `VIDSTAMP_DB_PATH` | `/tmp/vidstamp.db` (for now; data may be lost on restart). If you add a Persistent Disk later, change this to e.g. `/data/vidstamp.db`. |
    | `VIDSTAMP_REQUIRE_API_KEY` | `1` |
    | `VIDSTAMP_API_KEY` | Pick a long random string (e.g. 32+ characters). You’ll use this in the frontend too. Example: `mySecretKey123ChangeThisToSomethingRandom` |

14. Save. Render will redeploy automatically when you add or change env vars.

### 4. (Optional) Add a Persistent Disk so data survives restarts

15. In the service page, go to **Storage** (left sidebar).
16. Click **Add Disk**.
17. **Name:** e.g. `vidstamp-data`. **Mount Path:** `/data`. **Size:** 1 GB is plenty. Add the disk.
18. Go back to **Environment** and change `VIDSTAMP_DB_PATH` to **`/data/vidstamp.db`**. Save so the service redeploys.

### 5. Get the API URL and test it

19. On the service page, at the top you’ll see **Your service is live at** → e.g. `https://vidstamp-api.onrender.com`. Copy this URL.
20. Open `https://your-service-url.onrender.com/health` in a browser. You should see `{"status":"ok"}`.
21. Open `https://your-service-url.onrender.com/docs` to see the interactive API docs (Swagger UI).

### 6. Point the frontend at the API

22. In **Cloudflare Dashboard** → your frontend project (e.g. reflect-project) → **Settings** → **Environment variables** (or the build configuration).
23. Add (for Production and Preview if you use both):
    - **Variable:** `VITE_VIDSTAMP_API_URL` → **Value:** `https://vidstamp-api.onrender.com` (your actual Render URL, no trailing slash).
    - **Variable:** `VITE_VIDSTAMP_API_KEY` → **Value:** the same secret you set as `VIDSTAMP_API_KEY` in step 13.
24. Save and trigger a new frontend deploy (push a commit or **Retry deployment**). After that, submissions from the app will go to the Render API and you can view results via **GET /export** or **GET /export/sessions** (with the same API key in the `X-API-Key` header).
