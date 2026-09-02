# Tours Management Backend

The Tours Management page is backed by the `Tours` collection in Firestore.

## Data Used

- `Tours` for all tour definitions, hours, booking rules, intake fields, and publishing state.

## Backend Behavior

- `GET /api/tours`
  - Returns the tour list for the management dashboard.
- `POST /api/tours`
  - Creates a new tour definition.
- `PATCH /api/tours/:tourId`
  - Updates an existing tour, including display order and date-specific block days.
- `PATCH /api/tours/:tourId/publish`
  - Toggles published state.
- `DELETE /api/tours/:tourId`
  - Deletes a tour.
- Public booking behavior depends on the data maintained here.
