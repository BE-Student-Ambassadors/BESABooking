# Settings (settings.tsx)

- **File**: `src/pages/admin/views/settings.tsx`
- **Purpose**: Admin account settings focused on password updates.

## Data Flow
- Uses Firebase Auth locally only to observe the signed-in email.
- Sends password updates to `POST /api/admin/settings/password`.
- Local state: `currentEmail`, `passwordForm`, `error`, `message`, `passwordLoading`.
- Subscribes to auth state to keep `currentEmail` in sync.

## Key UI / Actions
- Read-only display of current email.
- Password update form:
  - Validates required fields, matching confirmation, and length.
  - Sends `email`, `currentPassword`, and `newPassword` to the backend settings endpoint.
  - Shows success/error banners.

## Extending
- Add email change flow through a backend endpoint if admin account management moves fully server-side.
- Add MFA or recovery options once enabled in Firebase.
