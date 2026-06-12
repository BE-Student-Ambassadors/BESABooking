# Tours Management Backend

The Tours Management page is backed by the `Tours` collection in Firestore.

## Data Used

- `Tours` for all tour definitions, hours, booking rules, intake fields, and publishing state.

## Backend Behavior

- Tour create/update actions write directly to Firestore.
- Public booking behavior depends on the data maintained here.
