# Schedule Backend

The Schedule page is served through the admin backend.

## Data Used

- `Bookings` for daily schedule views and booking edits/deletes.
- `Tours` for booking context.
- `Besas` for assignment display context.

## Backend Behavior

- `GET /api/admin/schedule`
  - Returns normalized `bookings`, `tours`, and `besas` for the schedule page.
- `PATCH /api/admin/bookings/:bookingId`
  - Updates schedule-edited bookings.
- `DELETE /api/admin/bookings/:bookingId`
  - Deletes bookings from the schedule page.
- Calendar/list grouping and date filtering remain frontend presentation logic.
