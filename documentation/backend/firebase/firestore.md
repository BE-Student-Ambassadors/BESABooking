# Firestore Data Model

The app reads/writes Firestore directly from the React client (no Cloud Functions). 

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
  - `officeHours`: map of day → `{ available: bool, timeSlots: [{ id, start, end }] }`
  - Legacy shapes may store `{ start, end }` per day; UI normalizes on read.

## Auth
- Firebase Authentication protects admin routes (email/password + Google provider). No separate `users` collection is stored.

## Tips for Changes
- When adding new fields, update:
  1) Type definitions (`src/types/global.d.ts`)
  2) Firestore write locations (e.g., `toursManagement.tsx`, booking flows)
  3) Any stats/derived calculations (dashboard, schedule)
