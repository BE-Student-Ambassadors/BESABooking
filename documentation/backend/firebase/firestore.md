# Firestore Data Model

The project still uses Firestore as the main data store, but admin-page reads/writes are now routed through the Express backend. Public booking flows still include direct client-side Firestore usage.

Core collections:

## Tours (`Tours` collection)
- **Doc ID**: `tourId`
- **Fields** (see `Tour` type in `src/types/global.d.ts`):
  - `title`, `description`
  - `duration` (number), `durationUnit` (`minutes` | `hours` | `hour`)
  - `maxAttendeesPerBooking`, `maxBookings`
  - `location`, `zoomLink`, `autoGenerateZoom` (bool)
  - `weeklyHours`: map of day → `[{ start, end }]`
  - `dateSpecificBlockDays`: array of `{ startDate, endDate?, slots[], unavailable: bool, appliesToAllTours?: bool }`
  - `dateSpecificDays`: availability ranges `{ startDate, endDate, notes? }`
  - `frequency`, `frequencyUnit`
  - `registrationLimit`, `minNotice`/`minNoticeUnit`, `maxNotice`/`maxNoticeUnit`
  - `bufferTime`, `bufferUnit`
  - `cancellationPolicy`, `reschedulingPolicy`
  - `intakeForm`: standard flags + `customQuestions[]`
  - `reminderEmails[]`
  - `sessionInstructions`
  - `published` (bool)
  - `createdAt` (string YYYY-MM-DD)
  - `displayOrder` (number)
  - `upcomingBookings`, `totalBookings` (numbers; used for stats)

## Bookings (`Bookings` collection)
- **Doc ID**: `bookingId`
- **Fields** (see `BookingData` in `src/types/global.d.ts`):
  - `tourId`, `timeSlot`, `groupSize`, `tourType`, `status`
  - `date` (YYYY-MM-DD), `startTime`, `endTime`, `time`
  - `attendees`, `maxAttendees`
  - `besas`: array of BESA identifiers (names/emails). Legacy `besa` string may exist; UI normalizes to array.
  - Contact fields: `email`, `firstName`, `lastName`, `phone`, `organization`, `role`
  - `accommodations`, `interests[]`, `leadGuide`, `notes`, `modificationReason`, `largeTourDetails`

## Besas (`Besas` collection)
- **Doc ID**: BESA id
- **Fields** (see `BesaData` in `src/types/global.d.ts` and `BesaType` in `BESAManagements.tsx`):
  - `name`, `email`, `status`, `role`
  - `supportedTourIds?`: array of `Tours` doc ids; empty or missing means the BESA can cover all tours
  - `officeHours`: map of day → `{ available: bool, timeSlots: [{ id, start, end }] }`
  - Legacy shapes may store `{ start, end }` per day; UI normalizes on read.
  - `tempAdjustments?`: one-day replacement office hours (type `TempAdjustment`):
    `{ id, date: 'YYYY-MM-DD', timeSlots: [{ id, start: 'HH:mm', end: 'HH:mm' }], reason?, createdAt: ISO string }`.
    On that date, these slots replace the BESA's `officeHours` for that weekday. At most one per BESA per date.
  - `tempUnavailability?`: time the BESA is out on one date (type `TempUnavailability`):
    `{ id, date: 'YYYY-MM-DD', allDay: bool, start?: 'HH:mm', end?: 'HH:mm', reason?, createdAt: ISO string }`.
    `start`/`end` are only set when `allDay` is false. Applied on top of whichever hours apply that day.
  - A BESA counts toward a slot (public booking coverage and auto-assignment) only if that day's effective hours
    cover the tour and no `tempUnavailability` overlaps it. Enforced in the backend (`availability.service.ts`,
    `assignment.service.ts`); helpers live in `backend/src/utils/besaTempSchedule.ts` with a frontend copy in
    `src/functions/besaTempSchedule.ts` (keep them in sync). Tours with `disableAutoAssignBesas` skip the coverage check.
  - Legacy: an `adjustments` field (earlier name for `tempUnavailability`) is read if `tempUnavailability` is missing.

## OfficeHoursChangeRequests (`OfficeHoursChangeRequests` collection)
- Created by the backend when an admin makes a permanent office-hours change on the calendar view.
- **Fields**: `besaId`, `email`, `name`, `date` (first date with the new hours), `from`/`to` (`{ start, end }`
  HH:mm), `status` (`pending` | `done` | `failed`), `error?`, `createdAt`, `completedAt?`, plus the calendar
  and event ids the Firebase Function changed.

## Auth
- Firebase Authentication protects admin routes (email/password + Google provider). No separate `users` collection is stored.

## Tips for Changes
- When adding new fields, update:
  1) Type definitions (`src/types/global.d.ts`)
  2) Backend repository/service/controller layers for admin-owned flows
  3) Public booking Firestore write locations where applicable
  4) Any stats/derived calculations (dashboard, schedule, BESA rollups)
