# App.tsx
# App.tsx

Entry point for the React SPA: wires routes, guards admin pages, fetches tour data for the public experience, and renders the booking homepage.

- **File**: `src/App.tsx`
- **Related docs**: [Admin pages overview](../adminpage/README.md)

## Structure

- `ProtectedRoute` — wraps admin routes; waits for Firebase Auth state and redirects unauthenticated users to `/admin`.
- `FeedbackButton` — floating button linking to a Google Form.
- `App` component
  - Loads tours from Firestore on mount (collection `Tours`) and stores them in local state, ordered by `displayOrder`.
  - Defines `PublicBookingView`, the main booking page.
  - Configures React Router routes.

## Data Flow

- **Tours fetch**: `useEffect` → `getDocs(collection(db, "Tours"))` → map docs into `Tour` objects → `setTours`.
- **Auth**: `onAuthStateChanged(auth, …)` inside `ProtectedRoute` controls access to admin routes.
- **Navigation**: `useNavigate` for quick jumps (e.g., Admin Login button).

## Routing Map

| Path | Element | Notes |
| --- | --- | --- |
| `/` | `PublicBookingView` | Tour list anchor |
| `/booking/:tourId` | `DynamicBookingForm` | Public booking flow |
| `/booking-confirmation/:bookingId` | `BookingConfirmationPage` | |
| `/parking-instructions` | `ParkingInstructionsPage` | |
| `/modify-booking` | `ModifyBookingsPage` | |
| `/admin` | `AdminPage` | Login screen |
| `/admin/dashboard` | `ProtectedRoute(DashboardLayout)` with nested routes below | |
| ├ `index` | `DashboardView` | |
| ├ `/admin/schedule` | `ScheduleView` | |
| ├ `/admin/tours` | `ToursManagementView` | Manage tours |
| ├ `/admin/besa` | `BESAManagementView` | |
| └ `/admin/office-hours` | `OfficeHoursView` | |
| `/admin/settings` | `ProtectedRoute(SettingsView)` | Separate route |
| `*` | `<Navigate to="/" />` | Catch-all redirect |

## PublicBookingView Highlights

- Top sticky header with BESA branding and Admin Login button.
- Hero section with CTA buttons for booking, modifying bookings, and parking info.
- Tour cards populated from the `tours` state (sorted by `displayOrder`).
- Links to FAQ-like sections: booking instructions, late/absent policy, virtual tours.

## Extending

- To add a new admin page, wrap the route in `ProtectedRoute` and place the component under `DashboardLayout` if it’s part of the main admin shell.
- To include new tour fields in the public cards, extend the Firestore mapping and the render loop in `PublicBookingView`.
