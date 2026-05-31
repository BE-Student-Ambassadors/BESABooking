# BESAs Backend

The BESAs page is backed by Firestore BESA records.

## Data Used

- `Besas` for names, email addresses, roles, status, and scheduling-related metadata.

## Backend Behavior

- Reads and writes happen directly from the client.
- BESA status and roles influence downstream scheduling and dashboard behavior.
