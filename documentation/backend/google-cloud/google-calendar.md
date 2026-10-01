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
