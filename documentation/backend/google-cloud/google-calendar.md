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
Temporary office-hour changes made on the booking site (`tempAdjustments` without `source: "calendar"`,
e.g. hours dragged on the Office Hours calendar view or added with the Adjusted Hours form) are mirrored to
Google Calendar by the `onBesaWrittenSyncTempAdjustments` Firebase Function (`functions/src/siteAdjustments.ts`).

- Each time slot becomes a `{Name}'s Availability (Temporary)` event with the BESA invited.
- Events go to `OFFICE_HOURS_WRITE_CALENDAR_ID`, or the first non-`primary` ID in `OFFICE_HOURS_CALENDAR_IDS`.
- Changing or removing the adjustment on the site updates or deletes the events; past dates are left alone.
- The events carry a `besaSiteAdjustmentId` extended property, so the calendar-to-site office hours sync
  (`functions/src/officeHours.ts`) ignores them instead of importing them a second time.
- Edits made directly to these events in Google Calendar are not read back; change them on the site.

