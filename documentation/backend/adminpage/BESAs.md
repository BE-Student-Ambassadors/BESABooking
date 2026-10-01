# BESAs Backend

The BESAs page is served through the admin backend plus the BESA CRUD routes.

## Data Used

- `Besas` for names, email addresses, roles, status, and scheduling-related metadata.
- `Bookings` for tour-count rollups and assigned-tour detail lists.
- `Tours` for supported-tour selection options.

## Backend Behavior

- `GET /api/admin/besas`
  - Returns BESAs, normalized bookings, and tour options for the management page.
  - Derives `toursThisWeek` and `totalTours` on the server.
- `POST /api/besas`
  - Creates a new BESA record.
- `PATCH /api/besas/:besaId`
  - Updates BESA profile fields such as name, email, role, status, and supported tours.
- `DELETE /api/besas/:besaId`
  - Deletes a BESA record.
- BESA status and roles continue to influence downstream scheduling and dashboard behavior.
