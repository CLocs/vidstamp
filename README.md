# REFLECT Project

Video annotator to capture timestamps manually marked by survey participants. Now with a back-end. 

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

