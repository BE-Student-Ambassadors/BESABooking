# Backend Notes

The app uses Firebase (Firestore + Auth) and Google Calendar APIs directly from the React client. Use the links below for details.

- [Firestore Data Model](./firestore.md) — collections and field shapes (Tours, Bookings, Besas, Auth).
- [Google Calendar Integration](./google-calendar.md) — how calendar invites are created and tokens requested.

No Cloud Functions currently live in this repo; all calls are client-side.
