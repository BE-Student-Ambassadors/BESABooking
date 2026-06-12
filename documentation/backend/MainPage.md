# Main Page Backend

The public booking flow is backed by client-side Firestore reads/writes and Google Calendar integration.

## Firestore Responsibilities

- Reads published tours from the `Tours` collection.
- Reads current bookings from the `Bookings` collection to prevent overbooking and cross-tour conflicts.
- Reads `Besas` office hours so only staffed time slots are offered.
- Writes the completed booking record to the `Bookings` collection.

## Google Calendar Responsibilities

- After a successful booking write, the app attempts to create the related calendar event/invite flow.
- Calendar details are built from the selected tour, selected slot, and submitted user information.

## Related Docs

- [Firestore Data Model](./firebase/firestore.md)
- [Google Calendar Integration](./google-cloud/google-calendar.md)
