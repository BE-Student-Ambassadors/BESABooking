# Schedule Backend

The Schedule page is backed by Firestore booking reads and writes.

## Data Used

- `Bookings` for daily schedule views and booking edits/deletes.

## Backend Behavior

- The page loads bookings directly from Firestore.
- Edits and deletes are written back to Firestore from the client.
- Calendar/list grouping is derived in the frontend from the fetched booking records.
