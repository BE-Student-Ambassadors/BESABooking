# Google Calendar Integration

Booking events are synchronized from Firestore by the Firebase Functions project in the separate `besabookingapi` repository.

- **Code**: `besabookingapi/functions/src/index.ts`
- **Dependencies**: Firebase Functions and `googleapis`

## Event Flow
1) The booking flow writes the booking to Firestore.
2) The `onBookingCreated` Firebase Function loads the tour and reads its `googleCalendarId`.
3) It inserts the event into that calendar using the configured Calendar OAuth account.
4) It writes `calendarEventId`, `calendarSyncCalendarId`, and sync metadata back to the booking.

## Creating Invites
- The Firebase Function uses the Google Calendar `events.insert` API with its OAuth account, so attendee invitations are supported.
- Set `googleCalendarId` per tour in the admin Availability step. Use `primary` or the destination calendar's ID.
- The function reads the calendar ID from the saved tour, rather than trusting a browser-provided value.

## Where It’s Used
- New bookings create an event after the Firestore booking is saved.
- Booking updates and deletes update or remove the synchronized event in the same calendar.

## Console Setup
- Configure the `CALENDAR_CLIENT_ID`, `CALENDAR_CLIENT_SECRET`, and `CALENDAR_REFRESH_TOKEN` Firebase Function secrets in `besabookingapi`.
- Share each destination calendar, including Slugworks, with the Google account that authorized the refresh token and give it permission to create events.

## Extending
- Deploy the Firebase Functions after changing their source or secrets.

## Office Hours: Temporary Changes from the Site
One-day office-hour changes made on the booking site (`tempAdjustments` without `source: "calendar"`) are
mirrored to Google Calendar by `onBesaWrittenSyncTempAdjustments` (`functions/src/siteAdjustments.ts`).

- An adjustment is the BESA's full hours for that date; `temporarySlots` says which of them are temporary
  (missing = all). An empty `timeSlots` means no office hours that day.
- The push edits that day's existing availability events instead of adding new ones: kept shifts are left
  alone, replaced events get the temporary time and are renamed "... (Temporary)", and leftover events that
  day are deleted. A new event is only created when there's nothing to edit.
- What it changed is recorded in `CalendarSyncState`, so removing or reverting the adjustment restores
  those events (times, names) exactly and deletes only events it created.
- Events it edits or creates carry a `besaSiteAdjustmentId` shared extended property, so the
  calendar-to-site sync doesn't import them again, and on those dates the sync doesn't derive the day's
  hours itself.
- Edits made to that day in Google Calendar (moving, resizing, deleting, adding availability events) are
  read back into the adjustment by `pullSiteAdjustmentEdits` on every calendar sync.
- Events go to `OFFICE_HOURS_WRITE_CALENDAR_ID`, or the first non-`primary` ID in `OFFICE_HOURS_CALENDAR_IDS`.

## Office Hours: Permanent Changes from the Site
Choosing **Permanent** on the Office Hours calendar view (for a BESA with `officeHoursSource: "calendar"`)
creates an `OfficeHoursChangeRequests` doc via `POST /api/besas/:besaId/office-hours/permanent-change`.
The `onOfficeHoursChangeRequested` Firebase Function (`functions/src/permanentChanges.ts`):

Requests have an `action`: `change` (move a weekly slot), `remove` (stop one weekly slot), `add` (new
weekly slot), or `removeAll` (stop all of the BESA's weekly series; right-click "Remove office hours").

For `add`, a new weekly `{Name}'s Availability` series is created next to the BESA's other series (or in
`OFFICE_HOURS_WRITE_CALENDAR_ID` if they have none). For `change` and `remove`:

1. Finds the BESA's `{Name}'s Availability` weekly series with the old time on that weekday.
2. Ends it the day before the change date, continues any other weekdays it covered in a new series, and
   (for `change`) starts a new series for that weekday with the new time. For `remove`, the ended series is
   marked `besaStoppedWeekly: "true"` (shared extended property) so the sync stops counting it toward the
   weekly pattern; other ended series still carry forward as before.
3. Runs the office hours sync so Firestore has the new weekly hours, then sets the request's `status` to
   `done` (or `failed` with an `error`). The site polls `GET /api/besas/office-hours-requests/:requestId`.

