# Dashboard Backend

The Dashboard is served through the admin backend.

## Data Used

- `Bookings` for recent bookings, modified-booking flags, and duplicate-email detection.
- `Tours` for contextual booking/tour metadata.
- `Besas` for roster and availability context used during edits.

## Backend Behavior

- `GET /api/admin/dashboard`
  - Returns dashboard bookings, tours, BESAs, and summary stats.
  - Normalizes booking and BESA data for admin UI consumption.
- `POST /api/admin/bookings/assignments`
  - Runs BESA assignment logic on the server.
  - Filters by active BESAs, supported tours, and office-hours availability.
  - Applies role-based priority ordering and caps results at two BESAs.
- `PATCH /api/admin/bookings/:bookingId`
  - Updates dashboard-edited bookings.
- `DELETE /api/admin/bookings/:bookingId`
  - Deletes dashboard bookings.
