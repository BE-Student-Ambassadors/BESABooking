# BESABooking

BESABooking is the Baskin Engineering Student Ambassador tour booking system. It includes a public booking flow for students and guests, plus an internal admin dashboard for managing bookings, schedules, tours, BESA staffing, office hours, and related settings.

## Running locally

Install dependencies from this directory, then run the frontend and API in separate terminals:

```bash
npm install
npm run dev
```

```bash
npm run dev:api
```

The Vite development server proxies `/api/*` requests to `http://127.0.0.1:8000`. Copy `backend/.env.example` to `backend/.env` and provide the Firebase Admin credentials before starting the local API.

## Deploying to Vercel

Vercel deploys `api/[...path].ts` as one Node.js serverless function. It runs the existing Express app for every `/api/*` request, while the SPA rewrite serves frontend routes.

In Vercel project settings, set the Root Directory to `BESABooking` if this repository is deployed from its parent directory. Use the Vite framework preset, build command `npm run build`, and output directory `dist`.

Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and `FRONTEND_ORIGIN` as environment variables. Set `FRONTEND_ORIGIN` to the production frontend URL. `FIREBASE_PRIVATE_KEY` accepts the full key with either literal line breaks or escaped `\\n` line breaks.

After deployment, verify the backend at `/api/health` on the deployed domain.

## Main Page

- [Main Page Usage](./documentation/frontend/mainpage/Usage.md)
- [Main Page Code Documentation](./documentation/frontend/mainpage/README.md)
- [Main Page Backend](./documentation/backend/MainPage.md)

## Dashboard

- [Dashboard Usage](./documentation/frontend/adminpage/DashboardUsage.md)
- [Dashboard Documentation](./documentation/frontend/adminpage/Dashboard.md)
- [Dashboard Backend](./documentation/backend/adminpage/Dashboard.md)

## Schedule

- [Schedule Usage](./documentation/frontend/adminpage/ScheduleUsage.md)
- [Schedule Documentation](./documentation/frontend/adminpage/Schedule.md)
- [Schedule Backend](./documentation/backend/adminpage/Schedule.md)

## Tours

- [Tours Usage](./documentation/frontend/adminpage/ToursManagementUsage.md)
- [Tours Documentation](./documentation/frontend/adminpage/ToursManagement.md)
- [Tours Backend](./documentation/backend/adminpage/ToursManagement.md)

## BESAs

- [BESAs Usage](./documentation/frontend/adminpage/BESAsUsage.md)
- [BESAs Documentation](./documentation/frontend/adminpage/BESAs.md)
- [BESAs Backend](./documentation/backend/adminpage/BESAs.md)

## Office Hours

- [Office Hours Usage](./documentation/frontend/adminpage/OfficeHoursUsage.md)
- [Office Hours Documentation](./documentation/frontend/adminpage/OfficeHours.md)
- [Office Hours Backend](./documentation/backend/adminpage/OfficeHours.md)

## Settings

- [Settings Usage](./documentation/frontend/adminpage/SettingsUsage.md)
- [Settings Documentation](./documentation/frontend/adminpage/Settings.md)
- [Settings Backend](./documentation/backend/adminpage/Settings.md)
