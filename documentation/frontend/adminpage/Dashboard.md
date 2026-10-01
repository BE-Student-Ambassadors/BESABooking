# Dashboard (dashboard.tsx)

- **File**: `src/pages/admin/views/dashboard.tsx`
- **Purpose**: Admin landing page for monitoring upcoming bookings, reviewing booking details, editing/deleting bookings, and managing BESA assignment suggestions during dashboard-based edits.

## Data Flow
- Uses `src/api.ts` for backend access.
- Reads dashboard data from `GET /api/admin/dashboard`.
- Requests BESA auto-assignment suggestions from `POST /api/admin/bookings/assignments`.
- Sends booking updates to `PATCH /api/admin/bookings/:bookingId`.
- Sends booking deletes to `DELETE /api/admin/bookings/:bookingId`.

## Key UI / Actions
- Booking list with edit/delete modals (local state `editBooking`, `deleteBooking`, `viewingBooking`).
- Stats cards for **today's tours** and **this week**.
- Recent-bookings table/card layout for upcoming bookings.
- Duplicate-email and modified-booking badges.
- Booking details modal.
- Booking edit modal with:
  - manual field edits
  - date/time changes
  - BESA auto-assignment refresh
  - manual BESA override/removal
- Normalizes BESA entries in bookings to guard against legacy shapes.

## Extending
- Add new KPIs in the backend dashboard response.
- Keep assignment logic centralized in the backend service rather than reintroducing client copies.
- Consider pagination/filters if bookings grow large.
