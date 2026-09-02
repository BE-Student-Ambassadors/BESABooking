# BESAs (BESAManagements.tsx)

- **File**: `src/pages/admin/views/BESAManagements.tsx`
- **Purpose**: Manage BESA guide roster, roles, status, and view their tour counts.

## Data Flow
- Loads roster, booking assignments, and tour options from `GET /api/admin/besas`.
- Uses backend-derived per-BESA metrics: `toursThisWeek` and `totalTours`.

## Key UI / Actions
- Roster table with inline editable fields (name, email, role, status).
- Add BESA modal via `POST /api/besas`; seeds `officeHours` with defaults.
- Save BESA changes via `PATCH /api/besas/:besaId`.
- Delete BESA via `DELETE /api/besas/:besaId`; updates local state.
- Per-BESA tour list modal (`viewingBesaTours`) to see bookings involving that guide.
- Role badges (`BESA`, `BESA Lead`, `BESAs On-Call`).

## Extending
- Add search/filter by role or status.
- Surface office hours summary in the roster list.
- Add bulk import/export (CSV) using the same normalized API shape.
