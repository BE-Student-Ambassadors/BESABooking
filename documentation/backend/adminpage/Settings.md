# Settings Backend

The Settings page now uses the backend for password updates.

## Backend Behavior

- `POST /api/admin/settings/password`
  - Verifies the provided email/current-password pair through Firebase Auth REST APIs.
  - Updates the password through the same backend service once verification succeeds.
- The page still reads the current signed-in email from Firebase Auth on the client for display.
