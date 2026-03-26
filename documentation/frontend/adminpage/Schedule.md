# Schedule (schedule.tsx)

- **File**: `src/pages/admin/views/schedule.tsx`
- **Purpose**: Calendar/list view of bookings with inline edit/delete.

## Data Flow
- Loads **Besas**, **Tours**, and **Bookings** from Firestore.
- Maintains multiple UI states: `viewMode` (`calendar`/`list`), `selectedDate`, `dateFilter` (`upcoming`/`past`/`all`), `selectedBooking`, and editing flags.
- Uses date helpers to avoid timezone shifts (e.g., `parseYMDLocal`, `ymdKey`).

## Key UI / Actions
- Month navigation, week grid, day selection.
- List view toggle (`Calendar` ↔ `List` icon).
- Edit booking form with save (`updateDoc`) and delete (`deleteDoc`) actions; `isSaving`/`isDeleting` guard double-submits.
- Displays BESA assignments and time ranges, formatting to 12h when needed.

## Extending
- Add filters by tour or BESA: derive from `bookings` + `tours`.
- Add CSV export: reuse `bookings` state.
- Centralize date formatting if reused elsewhere.
