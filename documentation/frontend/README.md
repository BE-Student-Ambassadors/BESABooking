# Frontend Documentation

This folder collects docs for the public site and the admin app. Use the links below to jump straight to each area.

## Local frontend startup

1. Open a terminal and go to the repo root:

```bash
cd <repo-root>
```

2. Install dependencies:

```bash
npm install
```

3. Start the frontend dev server:

```bash
npm run dev
```

4. Open:

```text
http://localhost:5173
```

Notes:

- In local development, the frontend proxies `/api/*` requests to `http://127.0.0.1:8000`.
- The backend server should already be running for admin pages to work.
- If you change `vite.config.ts`, restart the frontend dev server.

- [Main/Public Site](./mainpage/README.md)
- [Admin Pages](./adminpage/README.md)
