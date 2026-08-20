# Backend Notes

The repo now has a dedicated Express backend for admin operations, while the public booking flow still relies on Firebase/Firestore-backed client flows in several places.

## Local backend startup

1. Open a terminal and go to the backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Copy the example env file:

```bash
cp .env.example .env
```

4. Fill in `backend/.env` with:

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

6. Verify it is reachable:

```bash
curl http://127.0.0.1:8000/health
```

Use the links below for details:

- [Main Page Backend](./MainPage.md) — public booking/backend responsibilities.
- [Firestore Data Model](./firebase/firestore.md) — collections and field shapes (Tours, Bookings, Besas, Auth).
- [Google Calendar Integration](./google-cloud/google-calendar.md) — how calendar invites are created and tokens requested.
- [Admin Page Backend Docs](./adminpage/README.md) — dashboard, schedule, tours, BESAs, office hours, and settings backend ownership.
