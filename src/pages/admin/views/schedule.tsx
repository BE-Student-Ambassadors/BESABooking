import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../src/firebase.ts';
import { Calendar, List } from 'lucide-react';

export default function ScheduleView() {
  const [besas, setBesas] = useState<Besa[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [editForm, setEditForm] = useState<BookingData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dateFilter, setDateFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  // ---------- formatting helpers ----------
  const format = (date: Date, formatStr: string) => {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    if (formatStr === 'MMMM yyyy') return `${months[date.getMonth()]} ${date.getFullYear()}`;
    if (formatStr === 'MMMM d, yyyy') return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    if (formatStr === 'MMM d, yyyy') return `${shortMonths[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    if (formatStr === 'MM-dd-yyyy') return `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}-${date.getFullYear()}`;
    if (formatStr === 'EEEE') return days[date.getDay()];
    return date.toString();
  };

  // IMPORTANT: date-only helpers (avoid UTC shift)
  const parseYMDLocal = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0); // local date; no timezone shift
  };
  const ymdKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const normalizeDateKey = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  // ---------- calendar math ----------
  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const diff = d.getDate() - d.getDay();
    return new Date(d.setDate(diff));
  };
  const endOfWeek = (date: Date) => {
    const d = new Date(date);
    const diff = d.getDate() - d.getDay() + 6;
    return new Date(d.setDate(diff));
  };
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const isSameMonth = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  const subMonths = (date: Date, months: number) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  };
  const addMonths = (date: Date, months: number) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  // Convert 24hr to 12hr format
  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    if (time24.includes('AM') || time24.includes('PM')) return time24;
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const toMinutes = (time: string | undefined) => {
    if (!time) return Number.MAX_SAFE_INTEGER;
    const ampmMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hour = parseInt(ampmMatch[1], 10) % 12;
      if (ampmMatch[3].toUpperCase() === 'PM') hour += 12;
      const minute = parseInt(ampmMatch[2], 10) || 0;
      return hour * 60 + minute;
    }
    if (time.includes(':')) {
      const [h, m] = time.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    }
    return Number.MAX_SAFE_INTEGER;
  };

  // ---------- data fetch ----------
  useEffect(() => {
    const fetchBesas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'Besas'));
        const besasData = querySnapshot.docs.map(doc => {
          const data = doc.data() as any;
          const convertedOfficeHours: { [day: string]: OfficeHours } = {};
          Object.entries(data.officeHours || {}).forEach(([day, hours]: [string, any]) => {
            if (typeof hours === 'object' && 'start' in hours && 'end' in hours) {
              convertedOfficeHours[day] = {
                available: hours.available || false,
                timeSlots: hours.available
                  ? [{ id: Math.random().toString(36).substr(2, 9), start: hours.start || '09:00', end: hours.end || '17:00' }]
                  : []
              };
            } else {
              convertedOfficeHours[day] = (hours as OfficeHours) || { available: false, timeSlots: [] };
            }
          });
          return { id: doc.id, ...data, officeHours: convertedOfficeHours } as Besa[];
        }) as unknown as Besa[];
        setBesas(besasData);
      } catch (error) {
        console.error('Error fetching besas from Firestore:', error);
      }
    };
    fetchBesas();
  }, []);

  useEffect(() => {
    const fetchTours = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'mockTours'));
        const tourData = querySnapshot.docs.map(doc => ({
          tourId: doc.id,
          ...doc.data(),
        })) as Tour[];
        setTours(tourData);
      } catch (error) {
        console.error('Error fetching tours from Firestore:', error);
      }
    };
    fetchTours();
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'Bookings'));
        // Store the doc id as bookingId (stable key)
        const bookingsData = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          bookingId: doc.id, // doc.id must win over any stored bookingId
          date: normalizeDateKey((doc.data() as any).date),
        })) as BookingData[];
        setBookings(bookingsData);
      } catch (error) {
        console.error('Error fetching bookings from Firestore:', error);
      }
    };
    fetchBookings();
  }, []);

  // ---------- calendar grid ----------
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const calendarDays: Date[] = useMemo(() => {
    const days: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [gridStart.getTime(), gridEnd.getTime()]);

  const handleDayClick = (day: Date) => setSelectedDate(day);
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleSelectBooking = (booking: BookingData) => {
    setSelectedBooking(booking);
    setEditForm(booking);
    setIsEditing(false);
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking?.bookingId) {
      alert('Missing booking id, cannot delete.');
      return;
    }

    const confirmDelete = window.confirm('Delete this booking? This cannot be undone.');
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'Bookings', selectedBooking.bookingId));
      setBookings(prev => prev.filter(b => b.bookingId !== selectedBooking.bookingId));
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveBooking = async () => {
    if (!editForm?.bookingId) {
      alert('Missing booking id, cannot save changes.');
      return;
    }

    const payload: BookingData = {
      ...editForm,
      date: normalizeDateKey(editForm.date),
    } as BookingData;

    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'Bookings', editForm.bookingId), payload as any);
      setBookings(prev => prev.map(b => (b.bookingId === editForm.bookingId ? { ...b, ...payload } : b)));
      setSelectedBooking(prev => (prev && prev.bookingId === payload.bookingId ? { ...prev, ...payload } : prev));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- calendar: selected day + bookings ----------
  const selectedDateKey = ymdKey(selectedDate);
  const bookingDateTimeValue = (booking: BookingData) => {
    if (!booking?.date) return Number.MAX_SAFE_INTEGER;
    const date = parseYMDLocal(booking.date);
    const mins = toMinutes(booking.time);
    if (mins !== Number.MAX_SAFE_INTEGER) {
      date.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    }
    return date.getTime();
  };

  const isBookingPast = (booking: BookingData) => bookingDateTimeValue(booking) < new Date().getTime();

  const filteredBookings = useMemo(
    () =>
      bookings
        .filter(b => b.date === selectedDateKey)
        .slice()
        .sort((a, b) => bookingDateTimeValue(a) - bookingDateTimeValue(b)),
    [bookings, selectedDateKey]
  );

  const selectedWeekday = format(selectedDate, 'EEEE').toLowerCase() as keyof Besa['officeHours'];

  // show “hasBooking” markers without UTC shift
  const dayHasBooking = (day: Date) => bookings.some(b => b.date === ymdKey(day));

  // ---------- list view (upcoming / past / all) ----------
  const groupedBookings = useMemo(() => {
    const todayKey = ymdKey(new Date()); // 'YYYY-MM-DD'

    const filtered = bookings.filter(b => {
      if (!b?.date) return false;
      if (dateFilter === 'upcoming') return b.date >= todayKey; // today & future
      if (dateFilter === 'past') return b.date < todayKey;      // strictly before today
      return true; // 'all'
    });

    // sort by date/time ASC using real date math
    filtered.sort((a, b) => {
      const dateDiff = bookingDateTimeValue(a) - bookingDateTimeValue(b);
      if (dateDiff !== 0) return dateDiff;
      return (a.tourType || '').localeCompare(b.tourType || '');
    });

    // group by booking.date ('YYYY-MM-DD')
    const grouped: Record<string, BookingData[]> = {};
    for (const b of filtered) {
      (grouped[b.date] ||= []).push(b);
    }
    return grouped;
  }, [bookings, dateFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Management</h1>
        <p className="text-gray-600">View and manage tour schedules and office hours</p>

        {/* View Toggle */}
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium ${
              viewMode === 'calendar'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium ${
              viewMode === 'list'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <List className="h-4 w-4" />
            <span>List</span>
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar View */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-6">
                {/* Left side: Month navigation */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrevMonth}
                    className="text-lg px-3 py-1 text-black hover:bg-blue-50 rounded-lg"
                  >
                    &lt;
                  </button>
                  <h2 className="text-xl font-bold text-gray-900">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <button
                    onClick={handleNextMonth}
                    className="text-lg px-3 py-1 text-black hover:bg-blue-50 rounded-lg"
                  >
                    &gt;
                  </button>
                </div>

                {/* Right side: Today button */}
                <button
                  onClick={handleToday}
                  className="text-md px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  Today
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const hasBooking = dayHasBooking(day);
                  return (
                    <div
                      key={`${ymdKey(day)}-${i}`}
                      onClick={() => handleDayClick(day)}
                      className={`p-2 text-center text-sm h-12 flex items-center justify-center rounded-lg cursor-pointer
                        ${isSelected
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : hasBooking
                          ? 'border border-blue-400 text-blue-700 font-medium hover:bg-blue-50'
                          : isCurrentMonth
                          ? 'hover:bg-gray-100 text-gray-900'
                          : 'text-gray-300'}
                      `}
                    >
                      {day.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tours & Coverage */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6 max-h-[68vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Tours for {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <div className="space-y-4">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map(booking => {
                    const isPast = isBookingPast(booking);
                    return (
                      <div
                        key={booking.bookingId ?? `${booking.tourId}-${booking.date}-${booking.time}`}
                        className={`border-l-4 border-blue-500 pl-4 ${isPast ? 'opacity-60 bg-gray-50 rounded-lg' : ''}`}
                      >
                      <div className="flex justify-between items-start">
                        <div>
                          <button
                            onClick={() => handleSelectBooking(booking)}
                            className="font-medium text-blue-600 hover:underline text-left"
                          >
                            {booking.tourType}
                          </button>
                          <p className="text-sm text-gray-500">
                            {format(parseYMDLocal(booking.date), 'MMM d, yyyy')} at {formatTime12Hour(booking.time ?? '')}
                          </p>
                          <p className="text-sm text-gray-600">{booking.attendees} attendees</p>
                          <p className="text-sm text-gray-600">{booking.firstName} {booking.lastName}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              booking.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500">No tours scheduled.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {format(selectedDate, 'MMMM d, yyyy')} Coverage
              </h3>
              <div className="space-y-3">
                {besas
                  .filter(besa => besa.officeHours[selectedWeekday]?.available)
                  .map(besa => ({
                    besa,
                    earliest: Math.min(
                      ...(
                        besa.officeHours[selectedWeekday].timeSlots.map(slot => toMinutes(slot.start)) || [Number.MAX_SAFE_INTEGER]
                      )
                    ),
                  }))
                  .sort((a, b) => a.earliest - b.earliest)
                  .map(({ besa }) => (
                    <div key={(besa as any).id} className="mb-2">
                      <span className="text-sm text-gray-900 font-semibold">{(besa as any).name}</span>
                      {besa.officeHours[selectedWeekday].timeSlots.length > 0 ? (
                        <div className="ml-2 flex flex-wrap gap-2 mt-1">
                          {besa.officeHours[selectedWeekday].timeSlots
                            .slice()
                            .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
                            .map(slot => (
                              <span
                                key={slot.id}
                                className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded"
                              >
                                {formatTime12Hour(slot.start)} – {formatTime12Hour(slot.end)}
                              </span>
                            ))}
                        </div>
                      ) : (
                        <span className="ml-2 text-xs text-gray-500">No time slots</span>
                      )}
                    </div>
                  ))}
                {besas.filter(besa => besa.officeHours[selectedWeekday]?.available).length === 0 && (
                  <p className="text-gray-500">No BESA coverage for this day.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // List View
        <div className="space-y-6">
          {/* Filter Options */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tour Schedule</h3>
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setDateFilter('upcoming')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  dateFilter === 'upcoming'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                Upcoming
              </button>
              <button
                onClick={() => setDateFilter('past')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  dateFilter === 'past'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                Past
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  dateFilter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}>
                All
              </button>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto max-h-[80vh]">
              {Object.keys(groupedBookings).length > 0 ? (
                Object.entries(groupedBookings).map(([dateKey, dayBookings]) => {
                  const dateObj = parseYMDLocal(dateKey);
                  const sortedDayBookings = [...dayBookings].sort(
                    (a, b) => bookingDateTimeValue(a) - bookingDateTimeValue(b)
                  );
                  return (
                    <div key={dateKey} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <h4 className="font-bold text-gray-900 mb-3">
                        {format(dateObj, 'MMMM d, yyyy')}
                      </h4>
                      <div className="space-y-3 ml-4">
                        {sortedDayBookings.map(booking => {
                          const isPast = isBookingPast(booking);
                          return (
                            <div
                              key={booking.bookingId ?? `${booking.tourId}-${booking.date}-${booking.time}`}
                              className={`border border-gray-200 rounded-lg p-3 ${isPast ? 'opacity-60 bg-gray-50' : ''}`}
                            >
                            <div className="flex justify-between items-start">
                              <div>
                                <button
                                  onClick={() => handleSelectBooking(booking)}
                                  className="font-medium text-blue-600 hover:underline text-left"
                                >
                                  {booking.tourType}
                                </button>
                                <p className="text-sm text-gray-500">
                                  {formatTime12Hour(booking.time ?? '')}
                                </p>
                                <p className="text-md text-gray-600">
                                  {booking.firstName} {booking.lastName}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    booking.status === 'confirmed'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {booking.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">
                  {dateFilter === 'upcoming' ? 'No upcoming tours scheduled.' :
                   dateFilter === 'past' ? 'No past tours found.' :
                   'No tours scheduled.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900">Booking Details</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditing(prev => !prev)}
                  className="px-3 py-1 text-sm rounded-md border border-gray-200 hover:bg-gray-100"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button
                  onClick={handleDeleteBooking}
                  className="px-3 py-1 text-sm rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl">
                  ✕
                </button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-gray-700">First Name
                    <input
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={editForm?.firstName || ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, firstName: e.target.value } as BookingData : prev)}
                    />
                  </label>
                  <label className="text-sm text-gray-700">Last Name
                    <input
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={editForm?.lastName || ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, lastName: e.target.value } as BookingData : prev)}
                    />
                  </label>
                </div>

                <label className="text-sm text-gray-700">Tour Type
                  <input
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={editForm?.tourType || ''}
                    onChange={e => setEditForm(prev => prev ? { ...prev, tourType: e.target.value } as BookingData : prev)}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-gray-700">Date
                    <input
                      type="date"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={editForm?.date || ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, date: e.target.value } as BookingData : prev)}
                    />
                  </label>
                  <label className="text-sm text-gray-700">Time
                    <input
                      type="time"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={editForm?.time || ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, time: e.target.value } as BookingData : prev)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-gray-700">Attendees
                    <input
                      type="number"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={editForm?.maxAttendees ?? ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, maxAttendees: Number(e.target.value) } as BookingData : prev)}
                    />
                  </label>
                  <label className="text-sm text-gray-700">Status
                    <select
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={editForm?.status || ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, status: e.target.value } as BookingData : prev)}
                    >
                      <option value="">Select status</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                </div>

                <label className="text-sm text-gray-700">Notes
                  <textarea
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    rows={3}
                    value={editForm?.notes || ''}
                    onChange={e => setEditForm(prev => prev ? { ...prev, notes: e.target.value } as BookingData : prev)}
                  />
                </label>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBooking}
                    className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Contact Name:</span>
                  <p className="text-sm text-gray-900">{selectedBooking.firstName} {selectedBooking.lastName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Tour Type:</span>
                  <p className="text-sm text-gray-900">{selectedBooking.tourType}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Date & Time:</span>
                  <p className="text-sm text-gray-900">
                    {format(parseYMDLocal(selectedBooking.date), 'MMMM d, yyyy')} at {formatTime12Hour(selectedBooking.time ?? '')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Attendees:</span>
                    <p className="text-sm text-gray-900">{selectedBooking.maxAttendees}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Contact Email:</span>
                  <p className="text-sm text-gray-900">{selectedBooking.email}</p>
                </div>
                {selectedBooking.phone && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Phone:</span>
                    <p className="text-sm text-gray-900">{selectedBooking.phone}</p>
                  </div>
                )}
                {selectedBooking.organization && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Organization:</span>
                    <p className="text-sm text-gray-900">{selectedBooking.organization}</p>
                  </div>
                )}
                {selectedBooking.role && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Role:</span>
                    <p className="text-sm text-gray-900">{selectedBooking.role}</p>
                  </div>
                )}
                {selectedBooking.besas && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Assigned BESA:</span>
                    <p className="text-sm text-gray-900">{selectedBooking.besas}</p>
                  </div>
                )}
                {selectedBooking.interests && selectedBooking.interests.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Interests:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedBooking.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedBooking.leadGuide && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Lead Guide:</span>
                    <p className="text-sm text-gray-900">{selectedBooking.leadGuide}</p>
                  </div>
                )}
                {selectedBooking.notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Notes:</span>
                    <p className="text-sm text-gray-900">{selectedBooking.notes}</p>
                  </div>
                )}
                {selectedBooking.status && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedBooking.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
