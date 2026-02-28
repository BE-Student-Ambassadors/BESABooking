import { useState, useEffect } from 'react';
import type { UserRole } from "../../../appTypes.d.ts";
import { Calendar, Users, Trash2, X } from 'lucide-react';
import { db } from '../../../../src/firebase.ts';
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";

export default function DashboardView() {
  const [currentRole] = useState<UserRole>("public");
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [todaysTours, setTodaysTours] = useState(0);
  const [weeklyTours, setWeeklyTours] = useState(0);
  const [editBooking, setEditBooking] = useState<BookingData | null>(null);
  const [formData, setFormData] = useState<BookingData | null>(null);
  const [besaList, setBesaList] = useState<BesaData[]>([]);
  const [deleteBooking, setDeleteBooking] = useState<BookingData | null>(null);
  const [viewingBooking, setViewingBooking] = useState<BookingData | null>(null);

  const dayMapping = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };

  // Fetch BESA Data
  useEffect(() => {
    const fetchBESAs = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Besas")); 
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data();

          const convertedOfficeHours: { [day: string]: DayHours } = {};
          Object.entries(docData.officeHours || {}).forEach(([day, hours]) => {
            if (
              hours &&
              typeof hours === 'object' &&
              'start' in hours &&
              'end' in hours
            ) {
              convertedOfficeHours[day] = {
                available: true,
                timeSlots: [{
                  id: Math.random().toString(36).substr(2, 9),
                  start: typeof (hours as any).start === 'string' ? (hours as any).start : '09:00',
                  end: typeof (hours as any).end === 'string' ? (hours as any).end : '17:00'
                }]
              };
            } else if (
              hours &&
              typeof hours === 'object' &&
              'available' in hours &&
              'timeSlots' in hours
            ) {
              convertedOfficeHours[day] = {
                available: !!(hours as any).available,
                timeSlots: Array.isArray((hours as any).timeSlots)
                  ? (hours as any).timeSlots.map((slot: any) => ({
                      id: typeof slot.id === 'string' ? slot.id : Math.random().toString(36).substr(2, 9),
                      start: typeof slot.start === 'string' ? slot.start : '09:00',
                      end: typeof slot.end === 'string' ? slot.end : '17:00'
                    }))
                  : []
              };
            } else {
              convertedOfficeHours[day] = {
                available: false,
                timeSlots: []
              };
            }
          });

          return {
            id: doc.id,
            name: docData.name,
            email: docData.email,
            status: docData.status,
            role: docData.role,
            officeHours: convertedOfficeHours
          } as BesaData;
        });
        setBesaList(data);
      } catch (error) {
        console.error("Error fetching BESAs:", error);
      }
    };

    fetchBESAs();
  }, []);

  // Fetch Booking & Tour Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const toursSnap = await getDocs(collection(db, "Tours"));
        const toursData = toursSnap.docs.map(doc => ({
          tourId: doc.id,
          ...doc.data(),
        })) as Tour[];
        setTours(toursData);

        const bookingsRef = collection(db, "Bookings");
        const snapshot = await getDocs(bookingsRef);
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data() as any;
          const normalizedBesas = docData?.besas ? docData.besas : (docData?.besa ? [docData.besa] : []);

          return {
            ...docData,
            bookingId: doc.id, // always prefer Firestore doc id over any stale bookingId field
            besas: normalizedBesas
          };
        }) as BookingData[];

        // Sort by date ascending
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });

        setBookings(sortedData);

        // Stats
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const todayCount = data.filter((b) => b.date === todayStr).length;
        const weekCount = data.filter((b) => {
          const bookingDate = new Date(b.date);
          return bookingDate >= startOfWeek && bookingDate <= endOfWeek;
        }).length;

        setTodaysTours(todayCount);
        setWeeklyTours(weekCount);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchData();
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

  // Check if a booking time falls within a BESA's availability
  const isBesaAvailable = (besa: BesaData, bookingDate: string, bookingTime: string) => {
    if (!bookingDate || !bookingTime) return false;
    const [y, m, d] = bookingDate.split('-').map(Number);
    // Build local date so we don't roll back a day from UTC parsing
    const date = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
    const dayOfWeek = date.getDay();
    const dayKey = dayMapping[dayOfWeek as keyof typeof dayMapping];
    const dayHours = besa.officeHours[dayKey];
    if (!dayHours || !dayHours.available || dayHours.timeSlots.length === 0) return false;
    const bookingTime24 = parseTime12Hour(bookingTime);
    if (!bookingTime24) return false;
    return dayHours.timeSlots.some(slot => {
      return bookingTime24 >= slot.start && bookingTime24 <= slot.end;
    });
  };

  // Get available BESAs for a specific booking
  const getAvailableBesas = (booking: BookingData) => {
    return besaList.filter(besa => 
      besa.status === 'active' && isBesaAvailable(besa, booking.date, booking.startTime)
    );
  };

  // Auto-assign all available BESAs to a booking
  const autoAssignBesas = (bookingData: BookingData) => {
    const availableBesas = getAvailableBesas(bookingData);
    console.log(availableBesas);
    return {
      ...bookingData,
      besas: availableBesas.map(besa => besa.name)
    };
  };

  // Handle date/time changes and auto-assign BESAs
  const handleDateTimeChange = (field: 'date' | 'time', value: string) => {
    if (!formData) return;
    const updatedFormData = { ...formData, [field]: value };
    if (updatedFormData.date && updatedFormData.time) {
      const withAutoAssignedBesas = autoAssignBesas(updatedFormData);
      setFormData(withAutoAssignedBesas);
    } else {
      setFormData(updatedFormData);
    }
  };

  const handleEditClick = (booking: BookingData) => {
    setEditBooking(booking);
    setFormData({ ...booking, besas: booking.besas || [] });
  };

  const handleDeleteClick = (booking: BookingData) => {
    setDeleteBooking(booking);
  };

  const reloadBookings = async () => {
    const bookingsRef = collection(db, "Bookings");
    const snapshot = await getDocs(bookingsRef);
    const data = snapshot.docs.map((doc) => {
      const docData = doc.data() as any;
      return {
        ...docData,
        bookingId: doc.id, // ensure we always use the Firestore doc id
        besas: docData?.besas ? docData.besas : (docData?.besa ? [docData.besa] : [])
      };
    }) as BookingData[];
    setBookings(data);
  };

  const confirmDelete = async () => {
    if (!deleteBooking || !deleteBooking.bookingId) return;
    try {
      await deleteDoc(doc(db, "Bookings", deleteBooking.bookingId));
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
      await updateDoc(doc(db, "Bookings", formData.bookingId), saveData as any);
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
  const reassignBesas = () => {
    if (!formData) return;
    const withAutoAssignedBesas = autoAssignBesas(formData);
    setFormData(withAutoAssignedBesas);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <p className="text-3xl font-bold text-gray-900">{todaysTours}</p>
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
              <p className="text-3xl font-bold text-gray-900">{weeklyTours}</p>
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.besas && booking.besas.length > 0 ? (
                        <div className="space-y-1">
                          {booking.besas.map((besa) => (
                            <div
                              key={`${booking.bookingId}-${besa}`}
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
                    <span className="text-gray-700 break-all">{booking.email || '—'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-20">BESAs</span>
                    <div className="flex flex-wrap gap-2">
                      {booking.besas && booking.besas.length > 0 ? (
                        booking.besas.map((besa) => (
                          <span
                            key={`${booking.bookingId}-${besa}`}
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
                {viewingBooking.modificationReason && (
                  <p className="text-gray-700 mt-1">
                    Reschedule/Cancellation Reason: {viewingBooking.modificationReason}
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
                    {viewingBooking.besas.map((besa) => (
                      <span key={`${viewingBooking.bookingId}-${besa}`} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
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
                  {formData.besas.map((besa, index) => (
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
