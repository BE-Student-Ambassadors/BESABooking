# Main Page Usage

This guide explains the public booking flow from a student or guest perspective.

## Flow

1. Open the main booking site.
2. Review the available tour cards and choose a tour.
3. Pick an available date from the public date picker.
4. Choose an available time slot for that date.
5. Enter attendee count and booking details.
6. Submit the form and receive a booking confirmation.

## What Users See

- Tour cards with summary details such as duration and capacity.
- A date picker that only surfaces bookable dates.
- Time slots filtered by tour rules, BESA availability, notice windows, and conflicts.
- A final booking form with contact details, majors/interests, and any extra intake fields configured for the selected tour.

## Key Outcomes

- Users can only submit dates and times that pass the frontend availability checks.
- The final submission writes the booking to Firestore and attempts to create the related calendar event flow.
