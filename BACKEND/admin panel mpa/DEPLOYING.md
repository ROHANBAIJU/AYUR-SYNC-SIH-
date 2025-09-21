# Deploy Admin (Netlify) + API (Render) + DB (Neon)

This project now supports a runtime-configurable API base URL via `config.js` so you can deploy the static Admin anywhere.

## 0) What you need
- A GitHub repo with this code (or zip files for drag-and-drop options)
- Accounts: Netlify, Render (or Railway), Neon (or Supabase)

## 1) Create Postgres (Neon)
1. Create a new project (Region: closest to you)
2. Copy the connection string (use the **psql** format)
   - It should look like: `postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require`

## 2) Deploy API (Render)
1. New + Web Service → Select your GitHub repo
2. Root/Build: choose the `BACKEND` folder as the service root (Render will pick up `Dockerfile` there)
3. No build command needed (Dockerfile is used). Port will be auto-set (`PORT` env provided by Render). Our entrypoint reads `PORT`.
4. Set Environment Variables:
   - `DATABASE_URL` = your Neon connection string
   - `GEMINI_API_KEY` = (if you use AI features; optional for core flows)
   - `WHO_API_CLIENT_ID` and `WHO_API_CLIENT_SECRET` (optional; only for WHO API)
   - `WHO_TOKEN_URL` and `WHO_API_BASE_URL` (optional)
   - `ALLOW_ORIGINS` = `https://<your-netlify-site>.netlify.app, https://<your-custom-domain>` (comma-separated)
5. Deploy and wait until “Live”. Test:
   - Visit `https://<render-service>/` ⇒ should return a JSON welcome
   - Visit `https://<render-service>/api/openapi.json` ⇒ OpenAPI spec

## 3) Configure Admin (Netlify)
1. In `BACKEND/admin panel mpa`, create a `config.js` file by copying `config.example.js` and set your API URL:
   ```js
   // config.js
   window.API_BASE_URL = 'https://<render-service>/api';
   ```
2. Deploy options:
   - Easiest: Netlify drop → drag the folder `BACKEND/admin panel mpa` into https://app.netlify.com/drop
   - Or connect Git:
     - New Site from Git → select your repo
     - Build command: leave empty
     - Publish directory: `BACKEND/admin panel mpa`
3. After deploy, note your Netlify URL and add it to Render env `ALLOW_ORIGINS` if not done already, then redeploy API.

## 4) Smoke test
- Open Netlify site → Login (default admin/sih2024)
- You should see stats and can navigate to New Suggestions/Master Map/Rejections/ICD-11
- If you see CORS errors, ensure your Netlify URL is in Render `ALLOW_ORIGINS`
- If you see 401, your JWT token expired; just login again

## 5) Optional: Local admin vs remote API
You can test locally pointing at remote API: create `config.js` in the same folder with Render URL as above, then open `index.html` via Live Server.

## FAQ
- Why `config.js`? It lets you deploy the same static files to any host and just change the API URL at runtime without rebuilding.
- Why not `*` CORS? Browsers block `*` origin when `withCredentials` is used; we use tokens and cookies in some flows. Set explicit origins in `ALLOW_ORIGINS`.
