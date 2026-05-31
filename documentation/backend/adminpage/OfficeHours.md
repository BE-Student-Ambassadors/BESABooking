# Office Hours Backend

The Office Hours page is backed by the office-hours fields stored on BESA records.

## Data Used

- `Besas.officeHours` for weekday availability and time-slot windows.

## Backend Behavior

- Updates are written directly to Firestore.
- The main booking flow reads these hours to decide whether a public slot should be offered.
