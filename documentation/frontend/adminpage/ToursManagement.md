# ToursManagement.tsx

Admin UI for creating, editing, ordering, publishing, and globally blocking tour availability.

- **File**: `src/pages/admin/views/toursManagement.tsx`
- **Related**: [Admin Pages overview](./README.md) • [App.tsx](../mainpage/App.md) routes into this view.

## Component Breakdown

- `TourFormPage`
  - Multi-step form (Basic Info → Location → Availability → Scheduling Rules → Intake Form → Notifications → Review).
  - Local `tour` state initialized from `editingTour` or defaults.
  - Persists to Firestore:
    - New tour: `addDoc` to `Tours` with metadata.
    - Existing tour: `updateDoc` on `Tours/{tourId}`.
  - Manages granular fields: weekly hours, date-specific blocks, recurrence, notice windows, intake custom questions, reminder emails, and the Google Calendar destination.
  - Validates minimal fields per step (`canProceed`).

- `ToursDashboard`
  - Loads tours from `GET /api/tours`; populates `tours` state and enforces `displayOrder` sorting.
  - Actions per tour: edit, publish/unpublish, delete, move up/down (reorders and writes `displayOrder` back through API patches), view location/date summaries.
  - Filters: search term (title/description) and status (all/published/draft).
  - Universal holidays sidebar:
    - Aggregates `dateSpecificBlockDays` where `appliesToAllTours` is true across tours (`useMemo`).
    - Add universal override: pushes to every tour unless duplicate; persists through `PATCH /api/tours/:tourId`.
    - Remove universal override: strips matching block from every tour through the same API.

- `ToursManagement` (default export)
  - Page-level router between `ToursDashboard` and `TourFormPage`.
  - Holds shared `tours` state and `editingTour`.
  - `handleSaveTour` updates local state after form save; persisted writes are performed through the backend API handlers used inside `TourFormPage`.

## State & Data Flow

- Backend load: `GET /api/tours` → `setTours` (typed as `Dispatch<SetStateAction<Tour[]>>`).
- Reordering: local swap → optimistic `setTours` → `PATCH /api/tours/:tourId` for each tour’s `displayOrder`.
- Date-specific logic: `dateSpecificBlockDays` items optionally include `appliesToAllTours`; universal sidebar keeps cross-tour view consistent.
- Calendar destination: `googleCalendarId` is set in the Availability step. The booking Calendar Function reads this value from the saved tour, not from the browser booking payload.

## Extending Safely

- Add new tour fields: update `Tour` type (`src/types/global.d.ts`), extend form state defaults, and include fields in Firestore `addDoc`/`updateDoc`.
- Calendar routing: enter `primary` or a Google Calendar ID. The Calendar OAuth account configured in `besabookingapi` must have permission to create events in that calendar.
- New filters or sorting: adjust `filteredTours` and `sortByDisplayOrder`.
- Validation: enhance `canProceed` or add per-step inline messages.
- Bulk operations: reuse `setTours` functional updates to avoid stale closures.

## Quick Links

- `src/types/global.d.ts` — `Tour` shape.
- `src/pages/admin/views/toursManagement.tsx` — implementation.
- `documentation/frontend/mainpage/App.md` — routing context.
