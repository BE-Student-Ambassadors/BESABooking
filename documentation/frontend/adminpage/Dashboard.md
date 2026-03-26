# Dashboard (dashboard.tsx)

- **File**: `src/pages/admin/views/dashboard.tsx`
- **Purpose**: Admin landing page showing booking stats and lists, plus BESA roster snapshot.

## Data Flow
- Fetches **BESAs** (`Besas` collection) to display and normalize office hours.
- Fetches **Tours** (`Tours` collection) and **Bookings** (`Bookings` collection); sorts bookings by date.
- Calculates **today** and **this week** counts for quick KPIs.

## Key UI / Actions
- Booking list with edit/delete modals (local state `editBooking`, `deleteBooking`, `viewingBooking`).
- Normalizes BESA entries in bookings to guard against legacy shapes.
- Stats cards: today’s tours, weekly tours, totals.

## Extending
- Add new KPIs by computing against `bookings`.
- Tighten booking edit form validation before calling `updateDoc`.
- Consider pagination/filters if bookings grow large.
