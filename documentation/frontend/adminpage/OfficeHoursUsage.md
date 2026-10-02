# Office Hours Usage

The Office Hours page is where BESA availability windows are maintained.

## Typical Flow

1. Open Office Hours from the admin navigation.
2. Choose a BESA record.
3. Adjust available days and time slots.
4. Save the updated availability.

## Temporary Changes

Each BESA has a **Temporary Changes** section (expand the BESA on the Office Hours page). Both kinds save immediately.

**Adjusted Hours**: different office hours for one date only, without changing the weekly schedule.
Pick a date (the time slots start from the BESA's usual hours for that weekday), edit or add slots,
optionally add a reason, and click **Add Adjusted Hours**.

**Unavailability**: one-off absences like a dentist appointment. Pick a date, then a time range or
**Whole day**, optionally a reason, and click **Add Unavailability**.

Only today's and future changes are listed. Past ones are hidden until you click **View log**.
The right-hand **Upcoming Temporary Changes** card lists them for every BESA, and the Schedule page's
coverage panel shows adjusted hours and who is out on the selected date.

## Calendar View

Switch the Office Hours page from **List** to **Calendar** to see office hours as a weekly grid.

- Use the name tabs to pick a BESA, or **All** to see everyone at once (one colour per BESA; overlapping
  hours sit side by side, adjusted days have a dashed border, and red marks time they're out).
- Weeks are a carousel: this week, then each week with an upcoming temporary change. The arrows (or the
  date pills) move between them, and the weeks skipped in between are shown as dates under the title.
- Saturday and Sunday only appear in weeks where a BESA shown has hours or is out on that day.
- Each week lists its changes above the grid, with repeated unavailability of the same name grouped.
- Drag an hour block to move it, or drag its bottom edge to change when it ends. A popup asks how to save it:
  - **Temporary**: that day only. That day's event on Google Calendar is edited and renamed
    "(Temporary)" (a new event is only added when there's nothing to edit). If they have more than one
    shift that day, choose whether to replace just this shift or all of them. Moving it back to the usual
    hours puts their events back the way they were.
  - **Permanent**: every week on that weekday from that date on. For BESAs whose hours come from Google
    Calendar, the "{Name}'s Availability" recurring event is split there ("this and following events"),
    so earlier weeks stay as they were. Otherwise only the site's weekly hours change.
  - Days that already have adjusted hours can only be changed temporarily.
- Right-click an hour block (or empty space in a day) for more options:
  - **Add office hours…**: pick the BESA, date, and times, and whether it's for that date only or every week
    on that weekday. For that date only, choose which of their hours it replaces (one shift, all of them,
    or none).
  - **Change to temporary hours**: makes that shift a temporary change for that day only (its event is
    renamed "(Temporary)"); other weeks stay the same. With several shifts, keep or remove the others.
  - **Change to permanent hours** (temporary hours only): makes it repeat every week on that weekday.
  - **Remove office hours…**: just that day, that weekday from then on, or all of the BESA's office hours
    from then on.
- Changes made directly in Google Calendar are read back by the site, but replacing a BESA's other events
  that day is up to whoever makes the change there.
- Past days, and days changed in Google Calendar, can't be dragged.

Repeated unavailability with the same name (for example a weekly class from Google Calendar) is shown as
one item in the list view too, with **Show dates** to see each date. Removing it removes every date.

## Why It Matters

The public booking flow only surfaces time slots that are covered by active BESA office hours.
Adjusted hours can open or close times for that date, and if unavailability takes out the only BESA covering a time, that time is not offered for booking.
