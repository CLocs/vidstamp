# REFLECT Project

Video annotator to capture timestamps manually marked by survey participants.

---

## Architecture & operations

### The three parts

| Part | Role | Where it runs |
|------|------|----------------|
| **GitHub** | Holds the code (frontend + `api/`). Single repo. | GitHub.com |
| **Cloudflare** | Serves the **frontend** (password, survey, video, thank-you). This is the URL you give participants. | Cloudflare Workers/Pages |
| **Render** | Runs the **backend API** and stores submissions in SQLite. The frontend sends data here. | Render.com |

**How it fits together**

- One repo on GitHub contains both the React app and the `api/` folder.
- **Cloudflare** is connected to that repo and builds the whole repo as a frontend (Vite). It only serves the app; it does not run the API.
- **Render** is connected to the same repo with **Root Directory = `api`**. It only builds and runs the API; it never serves the React app.

So: **one GitHub repo, two separate deployments** (frontend on Cloudflare, API on Render).

**What happens on Submit**

1. User uses the app at your **Cloudflare** URL.
2. On Submit, the **frontend** sends data to the **Render** API URL (the one in `VITE_VIDSTAMP_API_URL`).
3. The **Render** service writes to its SQLite DB and returns success/failure.
4. You get data by calling the Render API (**GET /export** or **GET /export/sessions**) or, if you run the API locally, by opening the DB in DBeaver.

**What you do to update things**

- **Change code:** Push to GitHub. Cloudflare and Render each build and deploy their part from the same repo.
- **Change frontend env vars (e.g. API URL):** Set them in Cloudflare (Build variables), then trigger a new frontend deploy.
- **Change API env vars (e.g. API key, DB path):** Set them in Render’s Environment tab; Render redeploys when you save.

**Viewing the backend database (DBeaver vs API)**

- When the API runs **on Render**, the SQLite file lives on Render’s server. You **cannot** connect DBeaver on your PC directly to it (no direct file or DB connection to Render’s disk).
- **Use the API instead:** Call **GET /export** (CSV) or **GET /export/sessions** (JSON) from a browser or curl, with the `X-API-Key` header if you set one. Open the CSV in Excel or Google Sheets. See `api/README.md` for the exact URLs and examples.
- **DBeaver** only works when the API runs **locally** and you have the `vidstamp.db` file (e.g. `api/vidstamp.db`). Then in DBeaver: New Connection → SQLite → Path = that file.

---

### Flow and deploy details

| Part | What it is | Where it runs | What you do to update it |
|------|------------|----------------|---------------------------|
| **Source code** | The repo (frontend + `api/` backend) | **GitHub** | Edit code, push to `main` (or a branch). |
| **Frontend** | The React app (password, survey, video, thank-you) | **Cloudflare** (Workers/Pages) | Push to GitHub → Cloudflare auto-builds and deploys from the repo. |
| **Backend API** | FastAPI app that stores submissions in SQLite | **Render** | Push to GitHub → Render auto-builds and deploys the `api/` folder. |

**How a submission flows**

1. Participant opens the app at **reflect-project.dascolin.workers.dev** (or your Cloudflare URL).
2. They enter the password, choose role/PGY, watch the video, mark timestamps, and click Submit.
3. The **frontend** (Cloudflare) sends the data to the **backend** (Render) at `VITE_VIDSTAMP_API_URL` (e.g. `https://vidstamp-api.onrender.com`) via `POST /sessions`.
4. The **backend** writes the submission to its SQLite database (on Render’s server, or on a Persistent Disk you attached).
5. You view results by calling the backend: **GET /export** (CSV) or **GET /export/sessions** (JSON), or open the DB in DBeaver only if the API runs locally.

**One repo, two deploys**

- **GitHub** holds a single repo (e.g. `vidstamp`). It has both the React app (root, `src/`, etc.) and the API (`api/`).
- **Cloudflare** is connected to that repo and builds the **root** of the repo (Vite build). It does **not** run the API.
- **Render** is connected to the same repo with **Root Directory** set to **`api`**. It only builds and runs the API; it never serves the React app.

So: one push to GitHub can trigger **two** deploys (Cloudflare for frontend, Render for API), each building its own part of the repo. You don’t need to “deploy” from your machine for production; push to GitHub and both sides update.

**Summary**

- **GitHub** = source of truth for code.
- **Cloudflare** = hosts the frontend; participants use this URL.
- **Render** = hosts the API and database; frontend talks to it; you get data from it (export or DB).

---

## Screenshots

**Welcome (password)**

![Welcome / password](images/welcome-password.png)

**I am a... (Attending / Resident or Fellow, PGY)**

![I am a...](images/i-am-a-attending-pgy.png)

**Watch the video**

![Watch the video](images/watch-the-video.png)

**Thank you**

![Thank you](images/thank-you.png)

**Timestamps / CSV**

![Timestamps CSV](images/timestamps-csv.png)

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# Dev

## Local

Install dependencies
```bash
npm install
```

Start dev server
```bash
npm run dev
```

Click on the Local URL in the terminal.

## Deploy frontend

### Cloudflare Pages

1. In Cloudflare Dashboard: **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → select this repo.
2. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build` (or `npm run build:ghpages` if you need `404.html` for SPA routing; Cloudflare Pages often handles SPA fallback without it)
   - **Build output directory:** `dist`
   - If the site is at the root (e.g. `https://your-project.pages.dev/`), set `base: '/'` in `vite.config.js` instead of `'/vidstamp/'`.
3. **Environment variables** (optional, for backend sync):
   - `VITE_VIDSTAMP_API_URL` = your API base URL (e.g. `https://your-api.onrender.com`)
   - `VITE_VIDSTAMP_API_KEY` = your API key if the backend requires `X-API-Key`
4. Save and deploy. Your site will be at `https://<project-name>.pages.dev` (or your custom domain).

### GitHub Pages

1. **Repo name**  
   If your GitHub repo is not named `vidstamp`, set the same name in `vite.config.js` → `base: '/your-repo-name/'`.

2. **Install and deploy**  
   From the project root:
   ```bash
   npm install
   npm run deploy
   ```
   This builds the app, adds a `404.html` so routes like `/video` work, and pushes the `dist` folder to the `gh-pages` branch.

3. **Turn on Pages**  
   On GitHub: **Settings → Pages** → Source: **Deploy from a branch** → Branch: **gh-pages** → folder **/ (root)** → Save.

4. **URL**  
   The site will be at `https://<username>.github.io/vidstamp/` (or your repo name).

---

## Backend API (optional)

An optional FastAPI backend stores submissions and provides CSV export. See **[api/README.md](api/README.md)** for:

- **Local run:** `cd api && pip install -r requirements.txt && uvicorn app:app --reload`
- **Deploy** (e.g. Render): build/start commands, env vars (`VIDSTAMP_DB_PATH`, `VIDSTAMP_REQUIRE_API_KEY`, `VIDSTAMP_API_KEY`)
- **Endpoints:** `POST /sessions`, `GET /export`, `GET /export/sessions`

If you set **`VITE_VIDSTAMP_API_URL`** (and optionally **`VITE_VIDSTAMP_API_KEY`**) in the frontend build, the app will POST each submission to the API after downloading the CSV and show “(Synced to server)” or “(Sync failed: …)” on the thank-you page.

