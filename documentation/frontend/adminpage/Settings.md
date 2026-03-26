# Settings (settings.tsx)

- **File**: `src/pages/admin/views/settings.tsx`
- **Purpose**: Admin account settings focused on password updates.

## Data Flow
- Uses Firebase Auth to re-authenticate and update password.
- Local state: `currentEmail`, `passwordForm`, `error`, `message`, `passwordLoading`.
- Subscribes to auth state to keep `currentEmail` in sync.

## Key UI / Actions
- Read-only display of current email.
- Password update form:
  - Validates required fields, matching confirmation, and length.
  - Re-authenticates via `EmailAuthProvider.credential` before `updatePassword`.
  - Shows success/error banners.

## Extending
- Add email change flow (requires re-auth and `updateEmail`).
- Add MFA or recovery options once enabled in Firebase.
