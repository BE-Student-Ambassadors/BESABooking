# Office Hours Backend

The Office Hours page is backed by the office-hours fields stored on BESA records.

## Data Used

- `Besas.officeHours` for weekday availability and time-slot windows.
- `Besas.tempAdjustments` for one-day replacement office hours.
- `Besas.tempUnavailability` for time a BESA is out on a date (all day or a window).

## Backend Behavior

- Updates are written directly to Firestore.
- The main booking flow reads these hours to decide whether a public slot should be offered.
- Temporary changes save immediately when added or removed (independent of the office-hours Edit/Save flow).
- For a date, a `tempAdjustment` replaces that weekday's office hours; `tempUnavailability` is then subtracted.
- A slot is only offered if at least one active BESA's effective hours cover it and none of their unavailability overlaps it.
- Dashboard auto-assignment uses the same rules.
