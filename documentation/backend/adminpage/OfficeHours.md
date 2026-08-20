# Office Hours Backend

The Office Hours page is served through the admin backend plus the BESA office-hours update route.

## Data Used

- `Besas.officeHours` for weekday availability and time-slot windows.

## Backend Behavior

- `GET /api/admin/office-hours`
  - Returns normalized BESA office hours plus a compiled cross-BESA weekly coverage view.
- `PATCH /api/besas/:besaId/office-hours`
  - Persists office-hours edits for a specific BESA.
- The main booking flow reads these hours to decide whether a public slot should be offered.
