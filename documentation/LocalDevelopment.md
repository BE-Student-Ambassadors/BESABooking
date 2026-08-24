# Local Development

Use two terminals: one for the backend and one for the frontend.

## 1. Start the backend server

From the repo root:

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and provide:

```env
PORT=8000
FRONTEND_ORIGIN=http://localhost:5173
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=...
```

Then start the backend:

```bash
npm run dev
```

Verify it is running:

```bash
curl http://127.0.0.1:8000/api/health
```

## 2. Start the frontend server

In a second terminal:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

## 3. Local development notes

- The Vite dev server proxies `/api/*` requests to `http://127.0.0.1:8000`.
- The admin pages depend on the backend being up locally.
- If you change `vite.config.ts`, restart the frontend dev server.
- If you change backend source files, keep `npm run dev` running in `backend/`.
