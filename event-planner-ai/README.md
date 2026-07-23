# Event Planner AI

Event Planner AI is a polished, fully-featured full-stack web application designed to help you plan bespoke events, design chronological timelines, track coordination checklists, and estimate vendor budgets using Gemini AI.

This project is split into two independent, standalone projects:
- **`frontend/`** — React (with Vite), Tailwind CSS, and `framer-motion` / `motion` for beautiful, high-fidelity micro-interactions and transitions.
- **`backend/`** — Node.js, Express, and the modern `@google/genai` SDK for low-latency AI-generated plans. This is a pure JSON API server (no more built-in frontend serving).

They talk to each other over HTTP: in development, the frontend's Vite dev server proxies any `/api/*` request to the backend, so the app behaves exactly like it did before the split — you just now run two servers instead of one.

```
event-planner-ai/
├── backend/     # Express API (auth, events, Gemini plan generation, db.json)
├── frontend/    # React + Vite single-page app
├── metadata.json
└── assets/
```

---

## 🚀 How to Run Locally

### 📋 Prerequisites

- **Node.js** (v18.0.0 or higher is recommended)
- **npm** (comes bundled with Node.js) or another package manager like **Yarn** / **pnpm** / **Bun**

Each folder (`backend/` and `frontend/`) is its own project with its own `package.json` and needs its own `npm install`.

---

### 1. Set Up the Backend

```bash
cd backend
npm install
```

Set up your Gemini API key:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy the example env file and fill in your key:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and set:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   APP_URL="http://localhost:3000"
   ```

Run the API server:
```bash
npm run dev
```
It listens at 👉 **http://localhost:3000**

---

### 2. Set Up the Frontend

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Vite will print a local URL (typically 👉 **http://localhost:5173**). Open that in your browser — the frontend proxies all `/api/*` requests to the backend on port 3000 automatically, so both need to be running at the same time during development.

If your backend runs somewhere other than `http://localhost:3000`, set `VITE_API_URL` before starting the frontend (e.g. `VITE_API_URL=http://localhost:4000 npm run dev`).

---

### 3. Production Builds

**Backend** — bundles `server.ts` into a standalone Node script:
```bash
cd backend
npm run build
npm start
```

**Frontend** — builds static assets you can deploy to any static host (Vercel, Netlify, S3, nginx, etc.):
```bash
cd frontend
npm run build   # outputs to frontend/dist
npm run preview # optional local preview of the production build
```

> Note: the dev-time `/api` proxy only applies to `npm run dev`. If you deploy the frontend and backend to different domains in production, either put a reverse proxy in front of both (so `/api` still resolves to the backend), or point the frontend at the backend's public URL and enable CORS for that origin (CORS is already enabled for all origins by default in `backend/server.ts` — you may want to restrict it before going to production).

---

## 🛠️ Tech Stack & Key Files

- **`backend/server.ts`**: The core Node.js/Express API that handles authenticated requests, manages local data storage in `backend/db.json`, and triggers Gemini AI content generation with smart model fallback.
- **`frontend/src/App.tsx`**: The main Single-Page Application (SPA) dashboard containing responsive controls, interactive sliders, custom charts, and fluid tab switches.
- **`frontend/src/components/AnimatedLogo.tsx`**: Elegant SVG-based glowing brand identity.
- **`backend/.env.example`**: Configuration template for API keys and environment variables.

## What changed from the original single-folder version

- One shared `package.json` became two: `backend/package.json` (Express, `@google/genai`, `cors`, ...) and `frontend/package.json` (React, Vite, Tailwind, ...). The old root `package-lock.json` / `bun.lock` were dropped since they described the old combined dependency tree. Each folder now ships its own freshly generated `package-lock.json` — created and verified by actually running `npm install`, `tsc --noEmit`, and a full build in both folders, so `npm install` should reproduce exactly what was tested.
- `backend/server.ts` no longer starts Vite in middleware mode or serves the built frontend — it's now a focused JSON API. `cors` was added so the separately-hosted frontend can call it.
- `frontend/vite.config.ts` gained a `server.proxy` entry so existing relative calls like `fetch("/api/events")` in `App.tsx` keep working unchanged.
- `tsconfig.json` was split too: `frontend/tsconfig.json` keeps the original DOM/JSX settings, `backend/tsconfig.json` is a trimmed Node-only version.
