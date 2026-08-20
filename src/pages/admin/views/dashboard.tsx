import { useState, useEffect } from 'react';
import type { UserRole } from "../../../appTypes.d.ts";
import { Calendar, Users, Trash2, X } from 'lucide-react';
import api from '../../../api';

type DashboardResponse = {
  stats: {
    todaysTours: number;
    weeklyTours: number;
  };
  bookings: BookingData[];
  tours: Tour[];
  besas: BesaData[];
};

type DashboardAssignmentsResponse = {
  besas: string[];
};

const isDashboardResponse = (value: unknown): value is DashboardResponse => {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<DashboardResponse>;
  return (
    !!data.stats &&
    typeof data.stats.todaysTours === 'number' &&
    typeof data.stats.weeklyTours === 'number' &&
    Array.isArray(data.bookings) &&
    Array.isArray(data.tours) &&
    Array.isArray(data.besas)
  );
};

const besaSupportsTour = (besa: Pick<BesaData, 'supportedTourIds'>, tourId?: string) => {
  if (!tourId) return true;
  const supportedTourIds = Array.isArray(besa.supportedTourIds) ? besa.supportedTourIds : [];
  if (supportedTourIds.length === 0) return true;
  return supportedTourIds.includes(tourId);
};

export default function DashboardView() {
  const [currentRole] = useState<UserRole>("public");
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [todaysTours, setTodaysTours] = useState(0);
  const [weeklyTours, setWeeklyTours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assigningBesas, setAssigningBesas] = useState(false);
  const [editBooking, setEditBooking] = useState<BookingData | null>(null);
  const [formData, setFormData] = useState<BookingData | null>(null);
  const [besaList, setBesaList] = useState<BesaData[]>([]);
  const [deleteBooking, setDeleteBooking] = useState<BookingData | null>(null);
  const [viewingBooking, setViewingBooking] = useState<BookingData | null>(null);

  const normalizeBesaEntry = (besa: any) => {
    if (typeof besa === 'string') return besa;
    if (besa && typeof besa === 'object') {
      if (typeof besa.name === 'string' && besa.name.trim() !== '') return besa.name;
      if (typeof besa.email === 'string' && besa.email.trim() !== '') return besa.email;
    }
    return String(besa ?? '');
  };

  const loadDashboard = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get<DashboardResponse>('/api/admin/dashboard');
      const data = response.data;
      if (!isDashboardResponse(data)) {
        throw new Error('Invalid dashboard response payload.');
      }
      setBookings(data.bookings);
      setTours(data.tours);
      setBesaList(data.besas);
      setTodaysTours(data.stats.todaysTours);
      setWeeklyTours(data.stats.weeklyTours);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setBookings([]);
      setTours([]);
      setBesaList([]);
      setTodaysTours(0);
      setWeeklyTours(0);
      const message = error instanceof Error ? error.message : 'Failed to load dashboard data.';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  // Convert 12hr to 24hr format
  const parseTime12Hour = (time12: string) => {
    if (!time12) return '';
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const match = time12.match(timeRegex);
    if (!match) return '';
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    else if (ampm === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  };

  const toDateTime = (dateStr: string, time12?: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    // Build local date to avoid timezone shifting to the previous day
    const base = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
    if (!time12) return base; // treat as start of day if no time
    const t24 = parseTime12Hour(time12);
    if (!t24) return base;
    const [hh, mm] = t24.split(':').map(Number);
    base.setHours(hh, mm, 0, 0);
    return base;
  };

  const normalizeDateKey = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  // Today's bookings + future bookings (even if time earlier today)
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const futureBookings = bookings
    .map((b) => ({ ...b, date: normalizeDateKey(b.date) }))
    .filter((b) => {
      if (!b?.date) return false;
      if (b.date === todayKey) return true;
      const when = toDateTime(b.date, b.time || b.startTime);
      return when.getTime() >= now.getTime();
    })
    .sort((a, b) => toDateTime(a.date, a.time || a.startTime).getTime() - toDateTime(b.date, b.time || b.startTime).getTime());

  const isModifiedBooking = (booking: BookingData) => {
    return Boolean(booking.modificationReason?.trim());
  };

  const normalizedEmailCounts = bookings.reduce<Record<string, number>>((counts, booking) => {
    const normalizedEmail = booking.email?.trim().toLowerCase();
    if (!normalizedEmail) return counts;
    counts[normalizedEmail] = (counts[normalizedEmail] || 0) + 1;
    return counts;
  }, {});

  const hasDuplicateEmail = (booking: BookingData) => {
    const normalizedEmail = booking.email?.trim().toLowerCase();
    if (!normalizedEmail) return false;
    return (normalizedEmailCounts[normalizedEmail] || 0) > 1;
  };

  // Flag tours that have already occurred so we can gray them out visually
  const isBookingPast = (booking: BookingData) => {
    if (!booking?.date) return false;
    const normalizedDate = normalizeDateKey(booking.date);
    const hasTime = Boolean(booking.time || booking.startTime);

    // If no time is provided, only mark as past when the calendar date has passed
    if (!hasTime) {
      const bookingDay = toDateTime(normalizedDate);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return bookingDay.getTime() < todayStart.getTime();
    }

    const bookingDateTime = toDateTime(normalizedDate, booking.time || booking.startTime);
    return bookingDateTime.getTime() < now.getTime();
  };

  const formatBesas = (besas?: any[]) =>
    (besas || [])
      .map(normalizeBesaEntry)
      .filter((b) => b && typeof b === 'string');

  const requestBesaAssignments = async (bookingData: BookingData) => {
    if (!bookingData.date || !(bookingData.time || bookingData.startTime)) {
      return bookingData;
    }

    setAssigningBesas(true);
    try {
      const response = await api.post<DashboardAssignmentsResponse>('/api/admin/bookings/assignments', {
        bookingId: bookingData.bookingId,
        date: bookingData.date,
        time: bookingData.time || bookingData.startTime,
        startTime: bookingData.time || bookingData.startTime,
        tourId: bookingData.tourId,
      });

      return {
        ...bookingData,
        time: bookingData.time || bookingData.startTime,
        startTime: bookingData.time || bookingData.startTime,
        besas: response.data.besas,
      };
    } catch (error) {
      console.error("Error assigning BESAs:", error);
      alert("Failed to auto-assign BESAs.");
      return bookingData;
    } finally {
      setAssigningBesas(false);
    }
  };

  // Handle date/time changes and auto-assign BESAs
  const handleDateTimeChange = async (field: 'date' | 'time', value: string) => {
    if (!formData) return;
    const updatedFormData = {
      ...formData,
      [field]: value,
      ...(field === 'time' ? { startTime: value } : {})
    };
    setFormData(updatedFormData);
    if (updatedFormData.date && updatedFormData.time) {
      const withAutoAssignedBesas = await requestBesaAssignments(updatedFormData);
      setFormData(withAutoAssignedBesas);
    }
  };

  const handleEditClick = (booking: BookingData) => {
    setEditBooking(booking);
    setFormData({ ...booking, besas: formatBesas(booking.besas) });
  };

  const handleDeleteClick = (booking: BookingData) => {
    setDeleteBooking(booking);
  };

  const reloadBookings = async () => {
    await loadDashboard();
  };

  const confirmDelete = async () => {
    if (!deleteBooking || !deleteBooking.bookingId) return;
    try {
      await api.delete(`/api/admin/bookings/${deleteBooking.bookingId}`);
      await reloadBookings();
      setDeleteBooking(null);
      alert("Booking deleted successfully!");
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Failed to delete booking.");
    }
  };

  const handleSave = async () => {
    if (!editBooking || !formData) return;
    try {
      const saveData = {
        ...formData,
        besas: formData.besas?.filter(besa => besa.trim() !== '') || []
      };
      if (!formData.bookingId) throw new Error("Missing bookingId on formData");
      await api.patch(`/api/admin/bookings/${formData.bookingId}`, saveData);
      setEditBooking(null);
      await reloadBookings();
      alert("Booking updated successfully!");
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Failed to update booking.");
    }
  };

  // Add a new BESA slot
  // const addBesaSlot = () => {
  //   if (!formData) return;
  //   setFormData({
  //     ...formData,
  //     besas: [...(formData.besas || []), '']
  //   });
  // };

  // Remove a BESA slot
  const removeBesaSlot = (index: number) => {
    if (!formData) return;
    const newBesas = [...(formData.besas || [])];
    newBesas.splice(index, 1);
    setFormData({
      ...formData,
      besas: newBesas
    });
  };

  // Update a specific BESA slot
  // const updateBesaSlot = (index: number, value: string) => {
  //   if (!formData) return;
  //   const newBesas = [...(formData.besas || [])];
  //   newBesas[index] = value;
  //   setFormData({
  //     ...formData,
  //     besas: newBesas
  //   });
  // };

  // Reassign BESAs based on current date/time
  const reassignBesas = async () => {
    if (!formData) return;
    const withAutoAssignedBesas = await requestBesaAssignments(formData);
    setFormData(withAutoAssignedBesas);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {currentRole === 'admin' ? 'Admin Dashboard' : 'BESA Dashboard'}
        </h1>
        <p className="text-gray-600">
          {currentRole === 'admin'
            ? 'Manage tours, BESAs, and system settings'
            : 'Track your assigned tours and manage your schedule'
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border-b-4 border-orange-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Tours</p>
              <p className="text-3xl font-bold text-gray-900">{loading ? '...' : todaysTours}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-b-4 border-orange-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-3xl font-bold text-gray-900">{loading ? '...' : weeklyTours}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings (future only) */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tour</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BESAs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {futureBookings.map((booking) => {
                const isPast = isBookingPast(booking);
                return (
                  <tr
                    key={booking.bookingId}
                    className={`hover:bg-gray-50 ${isPast ? 'opacity-60 bg-gray-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button
                        onClick={() => setViewingBooking(booking)}
                        className="text-left text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {booking.tourType || 'Untitled Tour'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.date}
                      <div className="text-sm text-gray-500">{booking.time}</div>
                      {isModifiedBooking(booking) && (
                        <div className="mt-1">
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                            Modified
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.besas && booking.besas.length > 0 ? (
                        <div className="space-y-1">
                          {formatBesas(booking.besas).map((besa, index) => (
                            <div
                              key={`${booking.bookingId}-${besa}-${index}`}
                              className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-1"
                            >
                              {besa}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.firstName} {booking.lastName}
                      <div className="text-sm text-gray-500">{booking.email}</div>
                      {hasDuplicateEmail(booking) && (
                        <div className="mt-1">
                          <span className="inline-block rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                            Duplicate email
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(booking)}
                          className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(booking)}
                          className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {futureBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No upcoming bookings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {futureBookings.map((booking) => {
            const isPast = isBookingPast(booking);
            return (
              <div
                key={booking.bookingId}
                className={`p-4 ${isPast ? 'opacity-60 bg-gray-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button
                      onClick={() => setViewingBooking(booking)}
                      className="text-base font-semibold text-blue-700 hover:text-blue-900"
                    >
                      {booking.tourType || 'Untitled Tour'}
                    </button>
                    <p className="text-sm text-gray-600">
                      {booking.date}
                      {booking.time && <span className="text-gray-500"> · {booking.time}</span>}
                    </p>
                    {isModifiedBooking(booking) && (
                      <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        Modified
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(booking)}
                      className="px-3 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(booking)}
                      className="p-2 bg-red-100 text-red-700 rounded-full"
                      aria-label="Delete booking"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-sm text-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-20">Contact</span>
                    <span className="font-medium">{booking.firstName} {booking.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-20">Email</span>
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-700 break-all">{booking.email || '—'}</span>
                      {hasDuplicateEmail(booking) && (
                        <span className="inline-flex w-fit rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                          Duplicate email
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-20">BESAs</span>
                    <div className="flex flex-wrap gap-2">
                      {booking.besas && booking.besas.length > 0 ? (
                        formatBesas(booking.besas).map((besa, index) => (
                          <span
                            key={`${booking.bookingId}-${besa}-${index}`}
                            className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs"
                          >
                            {besa}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">None Assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {futureBookings.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">
              No upcoming bookings.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Booking</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the booking for <strong>{deleteBooking.firstName} {deleteBooking.lastName} </strong> 
              on {deleteBooking.date} at {deleteBooking.time}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteBooking(null)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {viewingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Tour</p>
                <h3 className="text-2xl font-bold text-gray-900">{viewingBooking.tourType || 'Untitled Tour'}</h3>
                <p className="text-sm text-gray-600">
                  {viewingBooking.date}
                  {viewingBooking.time && <span className="text-gray-500"> at {viewingBooking.time}</span>}
                </p>
              </div>
              <button
                onClick={() => setViewingBooking(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Booking</h4>
                <p className="text-gray-900 font-medium">Attendees: {viewingBooking.attendees || 0}/{viewingBooking.maxAttendees || '—'}</p>
                {viewingBooking.status && <p className="text-gray-700 mt-1">Status: {viewingBooking.status}</p>}
                {(viewingBooking.startTime || viewingBooking.endTime) && (
                  <p className="text-gray-700 mt-1">
                    Window: {viewingBooking.startTime || '—'} - {viewingBooking.endTime || '—'}
                  </p>
                )}
                {viewingBooking.timeSlot && <p className="text-gray-700 mt-1">Time Slot: {viewingBooking.timeSlot}</p>}
                {viewingBooking.notes && <p className="text-gray-700 mt-1">Notes: {viewingBooking.notes}</p>}
                {viewingBooking.accommodations && (
                  <p className="text-gray-700 mt-1">
                    Accommodations: {viewingBooking.accommodations}
                  </p>
                )}
                {viewingBooking.largeTourDetails && viewingBooking.largeTourDetails.trim() !== '' && (
                  <p className="text-gray-700 mt-1">
                    Large Tour Details: {viewingBooking.largeTourDetails}
                  </p>
                )}
                {viewingBooking.modificationReason && (
                  <p className="text-gray-700 mt-1">
                    Notes About This Change: {viewingBooking.modificationReason}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Contact</h4>
                <p className="text-gray-900 font-medium">
                  {[viewingBooking.firstName, viewingBooking.lastName].filter(Boolean).join(' ') || 'No name provided'}
                </p>
                {viewingBooking.email && <p className="text-gray-700">Email: {viewingBooking.email}</p>}
                {viewingBooking.phone && <p className="text-gray-700">Phone: {viewingBooking.phone}</p>}
                {viewingBooking.organization && <p className="text-gray-700">Organization: {viewingBooking.organization}</p>}
                {viewingBooking.role && <p className="text-gray-700">Role: {viewingBooking.role}</p>}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">BESAs</h4>
                {viewingBooking.besas && viewingBooking.besas.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formatBesas(viewingBooking.besas).map((besa, index) => (
                      <span key={`${viewingBooking.bookingId}-${besa}-${index}`} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {besa}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">None Assigned</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Interests</h4>
                {viewingBooking.interests && viewingBooking.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewingBooking.interests.map((interest, index) => (
                      <span key={`${interest}-${index}`} className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No interests specified</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editBooking && formData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Booking</h3>

            {/* First Name */}
            <label className="block mb-2 font-medium">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />

            {/* Last Name */}
            <label className="block mb-2 font-medium">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />

            {/* Contact Email */}
            <label className="block mb-2 font-medium">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />

            {/* Contact Phone */}
            <label className="block mb-2 font-medium">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />

            {/* Organization */}
            <label className="block mb-2 font-medium">Organization</label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />

            {/* Role */}
            <label className="block mb-2 font-medium">Role</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />

            {/* Tour Type */}
            <label className="block mb-2 font-medium">Tour</label>
            <select
              value={formData.tourId || ""}
              onChange={(e) => {
                const tour = tours.find(t => t.tourId === e.target.value);
                if (tour) setFormData({ ...formData, tourId: tour.tourId, tourType: tour.title });
              }}
              className="w-full px-3 py-2 border rounded-lg mb-4">
              <option value="">Select a tour</option>
              {tours.map((tour) => (
                <option key={tour.tourId} value={tour.tourId}>{tour.title}</option>
              ))}
            </select>

            {/* Date */}
            <label className="block mb-2 font-medium">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleDateTimeChange('date', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />

            {/* Time */}
            <label className="block mb-2 font-medium">Time</label>
            <input
              type="text"
              value={formData.time}
              onChange={(e) => handleDateTimeChange('time', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
              placeholder="e.g., 10:00 AM"
            />

            {/* Auto-assigned BESAs Display */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium">
                  BESA Assignments
                  {formData.date && formData.time && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Auto-assigned for {toDateTime(formData.date).toLocaleDateString('en-US', { weekday: 'long' })} at {formData.time})
                    </span>
                  )}
                </label>
                {formData.date && formData.time && (
                  <button
                    type="button"
                    onClick={reassignBesas}
                    className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-sm"
                  >
                    Refresh Assignments
                  </button>
                )}
              </div>

              {/* Display auto-assigned BESAs */}
              {formData.besas && formData.besas.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {formatBesas(formData.besas).map((besa, index) => (
                    <div key={`${besa}-${index}`} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex-1 text-sm text-green-800">
                        ✓ {besa} (auto-assigned)
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBesaSlot(index)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-3">
                  <p className="text-sm text-gray-600">
                    {formData.date && formData.time 
                      ? "No BESAs available at this date and time"
                      : "Set date and time to auto-assign BESAs"
                    }
                  </p>
                </div>
              )}

              {/* Manual BESA assignment option */}
              <div className="border-t pt-3">
                <label className="block mb-2 text-sm font-medium text-gray-600">Manual Override (Optional)</label>
                <div className="flex gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const newBesas = [...(formData.besas || []), e.target.value];
                        setFormData({ ...formData, besas: newBesas });
                        (e.target as HTMLSelectElement).value = ""; // Reset selection
                      }
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Add BESA manually...</option>
                    {besaList
                      .filter(b => b.status === 'active' && !formData.besas?.includes(b.name))
                      .map((besa) => (
                        <option key={besa.id} value={besa.name}>
                          {besa.name}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </div>

            {/* Attendees */}
            <label className="block mb-2 font-medium">Attendees</label>
            <input
              type="number"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />

            {/* Max Attendees */}
            <label className="block mb-2 font-medium">Max Attendees</label>
            <input
              type="number"
              value={formData.maxAttendees}
              onChange={(e) => setFormData({ ...formData, maxAttendees: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />

            {/* Interests */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">Selected Interests</label>
              {formData.interests && formData.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest, index) => (
                    <span
                      key={`${interest}-${index}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic text-sm">No interests specified</div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditBooking(null)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
