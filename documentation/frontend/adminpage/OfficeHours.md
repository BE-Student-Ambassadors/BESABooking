# Office Hours (officeHoursView.tsx)

- **File**: `src/pages/admin/views/officeHoursView.tsx`
- **Purpose**: Manage BESA weekly office hours with per-day slots.

## Data Flow
- Loads normalized BESA office hours and compiled weekly coverage from `GET /api/admin/office-hours`.
- Local state: `besas`, `compiledSchedule`, `editingOfficeHours` (besa id), `expandedBesas` (UI accordion).

## Key UI / Actions
- Expandable rows per BESA to view/edit office hours.
- Toggle day availability; add/remove time slots with generated ids.
- Save writes through `PATCH /api/besas/:besaId/office-hours`.
- Compiled schedule summary is now provided by the backend response instead of being assembled in the page.
- Time helpers for 12h/24h formatting.

## Extending
- Add validation to prevent overlapping slots.
- Add bulk copy (e.g., copy Monday to all weekdays).
- Surface integration status with Schedule/booking logic if needed.
