# Backend

This folder contains the Express backend for BESABooking admin operations.

## Intended request flow

1. `src/server.ts`
   Starts the HTTP server.
2. `src/app.ts`
   Registers middleware and API routes.
3. `src/routes/*.routes.ts`
   Maps endpoints to controllers.
4. `src/controllers/*.controller.ts`
   Parses requests and returns responses.
5. `src/services/*.service.ts`
   Holds business logic such as booking validation, conflict checks, and BESA auto-assignment.
6. `src/repositories/*.repository.ts`
   Reads and writes Firestore through the Admin SDK.
7. `src/config/firebaseAdmin.ts`
   Owns privileged Firebase initialization.

## Target ownership

- `bookings`
  Create, reschedule, cancel, and fetch bookings.
- `availability`
  Centralized date, slot, and conflict validation.
- `tours`
  Admin CRUD for tours and publish state.
- `besas`
  Admin CRUD for BESA records and office hours.
- `auth`
  Admin session verification and authorization hooks.

## Current scope

- Admin pages now call this backend for dashboard, schedule, tours, BESAs, office hours, and settings password updates.
- Firestore access for those admin flows is handled here through the Admin SDK.
- Public booking flows still have client-side Firebase/Firestore usage in other parts of the repo.

## Local setup

1. Open a terminal and go to the backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

4. Provide:
   - `PORT`
   - `FRONTEND_ORIGIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_WEB_API_KEY`

Example:

```env
PORT=8000
FRONTEND_ORIGIN=http://localhost:5173
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=...
```

5. Start the backend server:

```bash
npm run dev
```

6. Verify it is up:

```bash
curl http://127.0.0.1:8000/api/health
```

## Vercel deployment

The repository deploys the frontend and backend together on Vercel. The
`api/[...path].ts` serverless function forwards every `/api/*` request to the
Express app, so no separate backend host or start command is required.

1. Import the repository into Vercel with the repository root as the project root.
2. Use Vercel's default build command (`npm run build`).
3. Add the following environment variables in the Vercel project settings:
   - `FRONTEND_ORIGIN` set to the production Vercel URL.
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_WEB_API_KEY`
4. Deploy and verify `https://your-domain/api/health`.

Keep `VITE_API_BASE_URL` unset for this deployment. The frontend will then call
the API at the same Vercel domain using `/api/...`.
