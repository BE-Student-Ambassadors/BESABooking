# Backend Scaffold

This folder is the backend boundary for BESABooking.

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

## Notes

- This is a scaffold only. It does not install or run dependencies yet.
- The frontend should call this backend through `src/api.ts` once endpoints are implemented.
