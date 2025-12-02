import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../src/firebase.ts'; 
import { Calendar, Users, List, Eye } from 'lucide-react';

{/* Bookings show 1 day before */}
{/* Bookings stack days in view */}
{/* List management only shows month of september */}
{/* Past tours doesn't show past tours */}
{/* All tours doesn't show all tours */}

export default function ScheduleView() {
  const [besas, setBesas] = useState<Besa[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tours, setTours] = useState<Tour[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [dateFilter, setDateFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const format = (date: Date, formatStr: string) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    if (formatStr === 'MMMM yyyy') {
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    if (formatStr === 'MMMM d, yyyy') {
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    if (formatStr === 'MMM d, yyyy') {
      return `${shortMonths[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    if (formatStr === 'MM-dd-yyyy') {
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getFullYear()}`;
    }
    if (formatStr === 'EEEE') {
      return days[date.getDay()];
    }
    return date.toString();
  };

  const startOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const endOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const startOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const endOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + 6;
    return new Date(d.setDate(diff));
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isSameMonth = (date1: Date, date2: Date) => {
    return date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

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
    
    // Check if already in 12hr format
    if (time24.includes('AM') || time24.includes('PM')) {
      return time24;
    }
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get Pacific Time date
  const getPacificTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Date(d.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
  };

  // Fetch BESAS from firebase
  useEffect(() => {
    const fetchBesas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Besas"));
        const besasData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Convert old format to new format if needed
          const convertedOfficeHours: { [day: string]: OfficeHours } = {};
          Object.entries(data.officeHours || {}).forEach(([day, hours]: [string, any]) => {
            if (typeof hours === 'object' && 'start' in hours && 'end' in hours) {
              // Old format conversion
              convertedOfficeHours[day] = {
                available: hours.available || false,
                timeSlots: hours.available ? [{
                  id: Math.random().toString(36).substr(2, 9),
                  start: hours.start || '09:00',
                  end: hours.end || '17:00'
                }] : []
              };
            } else {
              // New format
              convertedOfficeHours[day] = hours as OfficeHours || { available: false, timeSlots: [] };
            }
          });

          return {
            id: doc.id,
            ...data,
            officeHours: convertedOfficeHours,
          };
        }) as Besa[];
        console.log("Fetched BESAs:", besasData);
        setBesas(besasData);
      } catch (error) {
        console.error("Error fetching besas from Firestore:", error);
      }
    };

    fetchBesas();
  }, []);

  // Fetch Tours from firebase
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "mockTours"));
        const tourData = querySnapshot.docs.map(doc => ({
          tourId: doc.id,
          ...doc.data(),
        })) as Tour[];
        setTours(tourData);
      } catch (error) {
        console.error("Error fetching tours from Firestore:", error);
      }
    };

    fetchTours();
  }, []);

  // Fetch Bookings from firebase
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Bookings"));
        const bookingsData = querySnapshot.docs.map(doc => ({
          tourId: doc.id,
          ...doc.data(),
        })) as BookingData[];
        setBookings(bookingsData);
      } catch (error) {
        console.error("Error fetching bookings from Firestore:", error);
      }
    };

    fetchBookings();
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const generateCalendarDays = () => {
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  const handleToday = () => {
    const today = getPacificTime(new Date());
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const selectedDateKey = format(getPacificTime(selectedDate), 'MM-dd-yyyy');
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = getPacificTime(booking.date);
    return format(bookingDate, 'MM-dd-yyyy') === selectedDateKey;
  });

  const selectedWeekday = format(selectedDate, 'EEEE').toLowerCase() as keyof Besa['officeHours'];

  // Get all bookings for list view
  const getAllBookings = () => {
  const now = new Date();
  const today = format(now, 'MM-dd-yyyy');
  
  return bookings.filter(booking => {
    if (dateFilter === 'upcoming') {
      // Compare date strings directly
      return booking.date >= today;
    } else if (dateFilter === 'past') {
      return booking.date < today;
    }
    return true; // 'all'
  }).sort((a, b) => {
    // Sort by date string (MM-dd-yyyy format sorts correctly when comparing same year)
    return a.date.localeCompare(b.date);
  });
};

  // Group bookings by date for list view
  const getGroupedBookings = (): { [key: string]: BookingData[] } => {
  const filteredBookings = getAllBookings();
  const grouped: { [key: string]: BookingData[] } = {}; // ← Add this type annotation
  
  filteredBookings.forEach(booking => {
    const dateKey = booking.date;
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(booking);
  });
  
  return grouped;
};

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
                    className="text-lg px-3 py-1 text-black hover:bg-blue-50 rounded-lg">&lt;
                  </button>
                  <h2 className="text-xl font-bold text-gray-900">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <button
                    onClick={handleNextMonth}
                    className="text-lg px-3 py-1 text-black hover:bg-blue-50 rounded-lg">&gt;
                  </button>
                </div>

                {/* Right side: Today button */}
                <button
                  onClick={handleToday}
                  className="text-md px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg">Today
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
                  const hasBooking = bookings.some(booking => {
                    const bookingDate = getPacificTime(booking.date);
                    return isSameDay(bookingDate, day);
                  });
                  return (
                    <div
                      key={i}
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
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Tours for {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              <div className="space-y-4">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map(booking => (
                    <div key={booking.tourId} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{booking.tourType}</p>
                          <p className="text-sm text-gray-500">
                            {format(getPacificTime(booking.date), 'MMM d, yyyy')} at {formatTime12Hour(booking.time)}
                          </p>
                          <p className="text-sm text-gray-600">{booking.attendees} attendees</p>
                          <p className="text-sm text-gray-600">{booking.firstName} {booking.lastName}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status}
                          </span>
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
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
                  .map(besa => (
                    <div key={besa.id} className="mb-2">
                      <span className="text-sm text-gray-900 font-semibold">{besa.name}</span>
                      {besa.officeHours[selectedWeekday].timeSlots.length > 0 ? (
                        <div className="ml-2 flex flex-wrap gap-2 mt-1">
                          {besa.officeHours[selectedWeekday].timeSlots.map(slot => (
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
              {Object.keys(getGroupedBookings()).length > 0 ? (
                Object.entries(getGroupedBookings()).map(([dateKey, dayBookings]) => {
                  const date = new Date(dateKey);
                  return (
                    <div key={dateKey} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <h4 className="font-bold text-gray-900 mb-3">
                        {format(date, 'MMMM d, yyyy')}
                      </h4>
                      <div className="space-y-3 ml-4">
                        {dayBookings.map(booking => (
                          <div key={booking.tourId} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{booking.tourType}</p>
                                <p className="text-sm text-gray-500">
                                  {formatTime12Hour(booking.time)}
                                </p>
                                <p className="text-md text-gray-600">{booking.firstName} {booking.lastName}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  booking.status === 'confirmed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {booking.status}
                                </span>
                                <button
                                  onClick={() => setSelectedBooking(booking)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
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
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900">Booking Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-xl">
                ✕
              </button>
            </div>
            
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
                  {format(getPacificTime(selectedBooking.date), 'MMMM d, yyyy')} at {formatTime12Hour(selectedBooking.time)}
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
              {selectedBooking.interests && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Interests:</span>
                  <p className="text-sm text-gray-900">{selectedBooking.interests}</p>
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
          </div>
        </div>
      )}
    </div>
  );
}
