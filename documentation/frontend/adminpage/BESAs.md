# BESAs (BESAManagements.tsx)

- **File**: `src/pages/admin/views/BESAManagements.tsx`
- **Purpose**: Manage BESA guide roster, roles, status, and view their tour counts.

## Data Flow
- Fetches **Besas** collection and **Bookings** collection.
- Normalizes booking records so `besas` is always an array (fallback from legacy `besa` field).
- Derives per-BESA metrics: `toursThisWeek` and `totalTours`.

## Key UI / Actions
- Roster table with inline editable fields (name, email, role, status).
- Add BESA modal (`addDoc` to `Besas`; seeds `officeHours` with defaults).
- Delete BESA (`deleteDoc`); updates local state.
- Per-BESA tour list modal (`viewingBesaTours`) to see bookings involving that guide.
- Role badges (`BESA`, `BESA Lead`, `BESAs On-Call`).

## Extending
- Add search/filter by role or status.
- Surface office hours summary in the roster list.
- Add bulk import/export (CSV) using the same normalized shape.
