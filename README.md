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

## Deploy to Render (static site)

Same pattern as the backend: push this folder to its own GitHub repo, then in
Render click **New → Blueprint** and pick that repo. `render.yaml` here
defines a static site build, so no separate manual setup is needed.

The one thing to update in Render's dashboard afterward: your backend's
`FRONTEND_URL` environment variable should be set to this frontend's real
`onrender.com` URL once you have it (used for the Pesapal payment redirect).
