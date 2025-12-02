import React, { useState, useEffect } from 'react';
import type { UserRole } from "../../../appTypes.d.ts";
import { Calendar, Users, Trash2, Plus, X } from 'lucide-react';
import { db } from '../../../../src/firebase.ts';
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";

{/* Bookings don't delete, tourID problem */}

export default function DashboardView() {
  const [currentRole, setCurrentRole] = useState<UserRole>("public");
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [todaysTours, setTodaysTours] = useState(0);
  const [weeklyTours, setWeeklyTours] = useState(0);
  const [editBooking, setEditBooking] = useState<BookingData | null>(null);
  const [formData, setFormData] = useState<BookingData | null>(null);
  const [besaList, setBesaList] = useState<BesaData[]>([]);
  const [deleteBooking, setDeleteBooking] = useState<BookingData | null>(null);

  const dayMapping = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
  };

  {/* Fetch BESA Data */}
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
                  start: typeof hours.start === 'string' ? hours.start : '09:00',
                  end: typeof hours.end === 'string' ? hours.end : '17:00'
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

  {/* Fetch Booking Data */}
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
          const docData = doc.data();
          return {
            tourId: doc.id,
            ...docData,
            // Handle backward compatibility - convert single besa to array
            besas: docData.besas ? docData.besas : (docData.besa ? [docData.besa] : [])
          };
        }) as BookingData[];

        // Sort bookings by date (most recent first)
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });

        setBookings(sortedData);

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(today);
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
    
    // Handle various time formats
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const match = time12.match(timeRegex);
    
    if (!match) return '';
    
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = match[3].toUpperCase();
    
    if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  };

  const toDateTime = (dateStr: string, time12?: string) => {
  const base = new Date(`${dateStr}T00:00:00`);
  if (!time12) return base; // treat as start of day if no time
  const t24 = parseTime12Hour(time12);
  if (!t24) return base;
  const [hh, mm] = t24.split(':').map(Number);
  base.setHours(hh, mm, 0, 0);
  return base;
};

const futureBookings = bookings
  .filter((b) => {
    if (!b?.date) return false;
    const when = toDateTime(b.date, b.time);
    const now = new Date();
    // same-day past times are excluded; future times included
    return when.getTime() >= now.getTime();
  })
  .sort((a, b) => toDateTime(a.date, a.time).getTime() - toDateTime(b.date, b.time).getTime());


  // Check if a booking time falls within a BESA's availability
  const isBesaAvailable = (besa: BesaData, bookingDate: string, bookingTime: string) => {
    if (!bookingDate || !bookingTime) return false;
    
    const date = new Date(bookingDate);
    const dayOfWeek = date.getDay();
    const dayKey = dayMapping[dayOfWeek as keyof typeof dayMapping];
    
    const dayHours = besa.officeHours[dayKey];
    if (!dayHours || !dayHours.available || dayHours.timeSlots.length === 0) {
      return false;
    }
    
    // Convert booking time to 24hr format for comparison
    const bookingTime24 = parseTime12Hour(bookingTime);
    if (!bookingTime24) return false;
    
    // Check if booking time falls within any of the BESA's time slots
    return dayHours.timeSlots.some(slot => {
      return bookingTime24 >= slot.start && bookingTime24 <= slot.end;
    });
  };

  // Get available BESAs for a specific booking
  const getAvailableBesas = (booking: BookingData) => {
    return besaList.filter(besa => 
      besa.status === 'active' && isBesaAvailable(besa, booking.date, booking.time)
    );
  };

  // Auto-assign all available BESAs to a booking
  const autoAssignBesas = (bookingData: BookingData) => {
    const availableBesas = getAvailableBesas(bookingData);
    return {
      ...bookingData,
      besas: availableBesas.map(besa => besa.name)
    };
  };

  // Handle date/time changes and auto-assign BESAs
  const handleDateTimeChange = (field: 'date' | 'time', value: string) => {
    if (!formData) return;
    
    const updatedFormData = {
      ...formData,
      [field]: value
    };
    
    // Auto-assign BESAs when both date and time are available
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

  const confirmDelete = async () => {
    if (!deleteBooking || !deleteBooking.tourId) return;
    
    try {
      await deleteDoc(doc(db, "Bookings", deleteBooking.tourId));
      
      // Refresh bookings list
      const bookingsRef = collection(db, "Bookings");
      const snapshot = await getDocs(bookingsRef);
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          tourId: doc.id,
          ...docData,
          besas: docData.besas ? docData.besas : (docData.besa ? [docData.besa] : [])
        };
      }) as BookingData[];
      setBookings(data);
      
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
      // Clean up the data before saving
      const saveData = {
        ...formData,
        besas: formData.besas?.filter(besa => besa.trim() !== '') || []
      };
      
      await updateDoc(doc(db, "Bookings", formData.tourId!), saveData);
      setEditBooking(null);
      
      const bookingsRef = collection(db, "Bookings");
      const snapshot = await getDocs(bookingsRef);
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          tourId: doc.id,
          ...docData,
          besas: docData.besas ? docData.besas : (docData.besa ? [docData.besa] : [])
        };
      }) as BookingData[];
      setBookings(data);
      
      alert("Booking updated successfully!");
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Failed to update booking.");
    }
  };

  // Add a new BESA slot
  const addBesaSlot = () => {
    if (!formData) return;
    setFormData({
      ...formData,
      besas: [...(formData.besas || []), '']
    });
  };

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
  const updateBesaSlot = (index: number, value: string) => {
    if (!formData) return;
    const newBesas = [...(formData.besas || [])];
    newBesas[index] = value;
    setFormData({
      ...formData,
      besas: newBesas
    });
  };

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

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tour</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendees</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BESAs</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {futureBookings.map((booking) => (
                <tr key={booking.tourId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.tourType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.date}
                    <div className="text-sm text-gray-500">{booking.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.maxAttendees}/{tours.find(t => t.title === booking.tourType)?.maxBookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.besas && booking.besas.length > 0 ? (
                      <div className="space-y-1">
                        {booking.besas.map((besa, index) => (
                          <div key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-1">
                            {besa}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Auto-assigned</span>
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
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                      (Auto-assigned for {new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long' })} at {formData.time})
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
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
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
                        e.target.value = ""; // Reset selection
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
                      key={index}
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
