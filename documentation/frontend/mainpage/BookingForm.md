# Booking Form (DynamicBookingFlow.tsx)

- **File**: `src/pages/DynamicBookingFlow.tsx`
- **Purpose**: Public booking experience for a specific tour; guides the user through selecting a tour, date/time, and attendee details, then writes a booking to Firestore and notifies the API.

## Components
- `BookingPage` — route-level component; fetches `Tours` from Firestore, reads `:tourId` from the URL, and renders the form.
- `DynamicBookingForm` — multi-section form with validation and submission logic.

## Data Flow
1) **Load tours**: `getDocs(collection(db, "Tours"))` → maps to `Tour` objects → `tours` state.
2) **Form state**: `bookingData` holds tour selection, date/time, attendee info, notes, accommodations, large tour details, etc.
3) **Date/time helpers**: `parseLocalDateTime`, `addMinutes`, `toLocalISO` keep scheduling in local time.
4) **Submission**:
   - Validates current step.
   - Derives duration, end time, ISO start/end, and location from the selected tour.
   - Auto-assigns BESAs via `getAutoAssignedBesas(date, startTime, duration)`.
   - Writes to Firestore: `setDoc` into `Bookings` with a generated `bookingId`, timestamps, and assigned BESAs.
   - Attempts to POST to `api.post("/book-tour/", bookingPayload)` (failure here does **not** block the booking).
   - Navigates to `/booking-confirmation` with summary state.

## Form Sections (high level)
1) Tour selection (uses `preselectedTour` from route if provided).
2) Date & time selection (availability logic uses tour weekly hours, date-specific blocks).
3) Attendee/contact info (first/last name, email, phone, organization, role, interests).
4) Group size & accommodations (including large tour details when applicable).
5) Review & submit.

## Key Behaviors
- Uses `currentSection` to gate navigation; `validateSection` ensures required fields per step.
- `isSubmitting` guard prevents double submits.
- Stores both human-readable times (`startTime`, `endTime`) and ISO strings (`startTimeISO`, `endTimeISO`) for downstream integrations (emails, calendar).
- Fails gracefully: catches Firestore/API errors and alerts the user without leaving the form in a partial state.

## Extending
- Capture `googleEventId` after calendar creation and save on the booking doc.
- Add payment or coupon steps by extending `bookingData` and `validateSection`.
- Add availability caching to reduce Firestore reads on page load.
