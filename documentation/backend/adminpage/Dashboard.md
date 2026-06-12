# Dashboard Backend

The Dashboard page reads from Firestore and derives summary information in the client.

## Data Used

- `Bookings` for recent bookings, modified-booking flags, and duplicate-email detection.
- `Tours` for contextual booking/tour metadata.
- `Besas` for roster and availability context used during edits.

## Backend Behavior

- No dedicated server endpoint powers the dashboard.
- All summary counts and list warnings are derived client-side after Firestore reads.
