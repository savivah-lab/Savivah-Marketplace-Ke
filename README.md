# Savivah frontend

A Vite + React app for the Savivah marketplace, talking directly to the live
backend at `https://savivah-backend.onrender.com` (see `API_BASE` in
`src/App.jsx` — change that one line if your backend URL ever changes).

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. It talks to the live Render backend, not a
local one — so you don't need the backend running locally to develop the UI,
but you do need internet access and the backend to actually be up.

## Google sign-in setup

The "Continue with Google" button only appears if a Client ID is configured.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an OAuth 2.0 Client ID (type: Web application). Add both
   `http://localhost:5173` and your real frontend URL (e.g.
   `https://savivah-frontend.onrender.com`) under Authorized JavaScript origins.
2. Locally: create `.env` with `VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`.
3. On Render: add the same `VITE_GOOGLE_CLIENT_ID` as an environment variable
   on the static site (Render exposes `VITE_`-prefixed vars to the Vite build).
4. The backend also needs the matching `GOOGLE_CLIENT_ID` set (see the backend
   README) — both sides verify against the same Client ID.

Any email ending in `@savivah.co.ke` — whether signing up via Google or
email/password — automatically becomes an admin account, on both sides.

## Deploy to Render (static site)

Same pattern as the backend: push this folder to its own GitHub repo, then in
Render click **New → Blueprint** and pick that repo. `render.yaml` here
defines a static site build, so no separate manual setup is needed.

The one thing to update in Render's dashboard afterward: your backend's
`FRONTEND_URL` environment variable should be set to this frontend's real
`onrender.com` URL once you have it (used for the Pesapal payment redirect).
