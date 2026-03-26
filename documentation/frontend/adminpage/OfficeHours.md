# Office Hours (officeHoursView.tsx)

- **File**: `src/pages/admin/views/officeHoursView.tsx`
- **Purpose**: Manage BESA weekly office hours with per-day slots.

## Data Flow
- Fetches **Besas** collection; normalizes `officeHours` to a consistent shape (per-day `available` + `timeSlots`).
- Local state: `besas`, `editingOfficeHours` (besa id), `expandedBesas` (UI accordion).

## Key UI / Actions
- Expandable rows per BESA to view/edit office hours.
- Toggle day availability; add/remove time slots with generated ids.
- Save writes back to Firestore (`updateDoc` on `Besas/{id}`).
- Time helpers for 12h/24h formatting.

## Extending
- Add validation to prevent overlapping slots.
- Add bulk copy (e.g., copy Monday to all weekdays).
- Surface integration status with Schedule/booking logic if needed.
