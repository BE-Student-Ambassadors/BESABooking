# Google Calendar Integration

Calendar invites are created client-side via the Google Calendar REST API and Google Identity Services (GIS).

- **Code**: `src/calendarAPI.tsx`
- **Dependencies**: `googleapis` (for potential server-side use), GIS script loaded in browser.

## Token Flow
1) `getCalendarAccessToken(clientId)` loads GIS (`https://accounts.google.com/gsi/client`).
2) GIS `initTokenClient` requests scope `https://www.googleapis.com/auth/calendar.events`.
3) Returns an access token; consent shown on first call.

## Creating Invites
- `insertCalendarEvent({ accessToken, summary, description?, location?, startISO, endISO, calendarId?, attendeeEmail?, attendeeName?, timezone? })`
- Posts to `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events?sendUpdates=all`
- Sets attendee, disables guest modifications, uses default reminders.

## Where It’s Used
- Booking flows can call `insertCalendarEvent` after a booking is confirmed, passing attendee email and BESA (as `attendeeName`) if desired.
- BESA assignment updates can trigger a new event or update workflow (not implemented yet; add a docstring in code when adding).

## Console Setup
- Create OAuth 2.0 Client ID (Web) in Google Cloud Console.
- Authorized JS origins: your deployed domains and `http://localhost:5173` (vite dev) or equivalent.
- Authorized redirect URIs: not needed for token client (uses popup), but keep your app domain whitelisted.
- Store the client id in env/config and pass to `getCalendarAccessToken`.

## Extending
- Add event updates/cancellations: use `PATCH /events/{id}` or `DELETE /events/{id}` with the same token.
- Persist `googleEventId` on the booking document to support edits/cancels.
- If moving logic server-side, use a service account with domain-wide delegation and keep tokens off the client.
