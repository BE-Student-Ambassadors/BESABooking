import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {Calendar, Clock, Users, User, ArrowLeft, ArrowRight, Check, AlertCircle, GraduationCap, ChevronRight, ChevronLeft} from "lucide-react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../src/firebase.ts";
// import { getCalendarAccessToken, insertCalendarEvent } from "../calendarAPI.tsx";
import api from "../api.ts";

// Add Booking type definition (adjust fields as needed)
type Booking = {
  tourId: string;
  date: string;
  time: string;
  // Add other fields as needed
};

{/* Have calendar date show actual available dates (doesn't allow weekends, etc ) */}
{/* Hide tours not selected*/}
{/* Scheduling Rules: Show Date Ranges */}

interface DynamicBookingFormProps {
  onBack: () => void | Promise<void>;
  preselectedTour?: string;
  tours: Tour[];
  navigate: (path: string, options?: any) => void;
}

interface CustomCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  tourData: Tour | undefined;
  isDateAvailable: (dateString: string, tour: Tour) => { available: boolean; reason?: string };
  minDate?: Date | null;
  maxDate?: Date | null;
}

// ---------- Page (parent) ----------
function parseLocalDateTime(dateStr: string, timeLabel: string): Date {
  // Example timeLabel: "3:05 PM"
  const m = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) throw new Error(`Unexpected time format: ${timeLabel}`);
  let [_, hhStr, mmStr, ampm] = m;
  let hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  if (/PM/i.test(ampm) && hh !== 12) hh += 12;
  if (/AM/i.test(ampm) && hh === 12) hh = 0;

  // Construct as local time
  const [Y, M, D] = dateStr.split("-").map(Number);
  return new Date(Y, (M - 1), D, hh, mm, 0, 0);
}

function addMinutes(dt: Date, minutes: number): Date {
  return new Date(dt.getTime() + minutes * 60_000);
}

function toLocalISO(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const offMin = dt.getTimezoneOffset();
  const sign = offMin > 0 ? "-" : "+";
  const abs = Math.abs(offMin);
  const offH = pad(Math.floor(abs / 60));
  const offM = pad(abs % 60);

  return (
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` +
    `T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}` +
    `${sign}${offH}:${offM}`
  );
}

function BookingPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const navigate = useNavigate();
  const { tourId } = useParams<{ tourId: string }>();  // <-- must match route

  useEffect(() => {
  const fetchTours = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "Tours"));
      const toursData: Tour[] = querySnapshot.docs.map((d) => {
        const data: any = d.data();
        return {
          tourId: d.id, // ← Changed from 'id' to 'tourId'
          title: data.title ?? "",
          description: data.description ?? "",
          duration: data.duration ?? 0,
          durationUnit: data.durationUnit ?? "minutes",
          maxAttendeesPerBooking: data.maxAttendees ?? 5,
          maxBookings: data.maxBookings ?? 3,
          startDate: data.startDate, // ← Add this
          endDate: data.endDate, // ← Add this
          location: data.location ?? "",
          zoomLink: data.zoomLink ?? "",
          autoGenerateZoom: data.autoGenerateZoom ?? false,
          weeklyHours: data.weeklyHours ?? {},
          dateSpecificBlockDays: data.dateSpecificBlockDays ?? [],
          dateSpecificDays: data.dateSpecificDays ?? [], // ← Add this
          frequency: data.frequency ?? 1,
          frequencyUnit: data.frequencyUnit ?? "hours",
          registrationLimit: data.registrationLimit ?? 1,
          minNotice: data.minNotice ?? 0,
          minNoticeUnit: data.minNoticeUnit ?? "hours",
          maxNotice: data.maxNotice ?? 1,
          maxNoticeUnit: data.maxNoticeUnit ?? "days",
          bufferTime: data.bufferTime ?? 0,
          bufferUnit: data.bufferUnit ?? "minutes",
          cancellationPolicy: data.cancellationPolicy ?? "",
          reschedulingPolicy: data.reschedulingPolicy ?? "",
          intakeForm: data.intakeForm ?? {
            firstName: true,
            lastName: true,
            email: true,
            phone: false,
            attendeeCount: true,
            majorsInterested: false,
            customQuestions: [],
          },
          reminderEmails: data.reminderEmails ?? [],
          sessionInstructions: data.sessionInstructions ?? "",
          published: data.published ?? false,
          createdAt: data.createdAt ?? "",
          upcomingBookings: data.upcomingBookings ?? 0,
          totalBookings: data.totalBookings ?? 0,
        } as Tour;
      });
      setTours(toursData);
    } catch (error) {
      console.error("Error fetching tours:", error);
    }
  };
  fetchTours();
}, []);

  return (
    <DynamicBookingForm
      tours={tours}
      onBack={() => navigate("/")}
      preselectedTour={tourId ?? ""} 
      navigate={navigate}
    />
  );
}

// ---------- Form (child) ----------
const DynamicBookingForm: React.FC<DynamicBookingFormProps> = ({
  onBack,
  preselectedTour = "",
  tours,
  navigate,
}) => {
  const [currentSection, setCurrentSection] = useState(1);
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Booking Data State
  const [bookingData, setBookingData] = useState<BookingData>({
    tourId: preselectedTour || "",
    tourType: "",
    date: "",
    time: "",
    attendees: 1,
    maxAttendees: 1, // Default group size to 1
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organization: "",
    role: "",
    interests: [],
    timeSlot: "",
    groupSize: 1,
    status: "",
    leadGuide: "",
    notes: "",
    besas: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- Add bookings state and fetch logic ---
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Bookings"));
        const bookingsData = querySnapshot.docs.map((doc) => doc.data());
        setBookings(bookingsData);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };
    fetchBookings();
  }, []);

  const sections = [
    { id: 1, title: "Date & Type of Tour", description: "Choose your preferred tour and date" },
    { id: 2, title: "Available Times", description: "Select your time slot and group details" },
    { id: 3, title: "Preferences & Booking Info", description: "Complete your booking information" },
  ];

  // ---------- Helpers for Section 1 ----------
  const selectTourById = (id: string) => {
    const t = tours.find(x => String(x.tourId) === String(id));
    if (!t) {
      console.warn("Tour not found for id:", id, "Available:", tours.map(tt => tt.tourId));
      return;
    }
    setSelectedTour(t.tourId);
    setBookingData(prev => ({
      ...prev,
      tourId: t.tourId,
      tourType: t.title,
      maxAttendees: 1, // Always default to 1 when selecting a tour
    }));
    console.log("Tour Selected", t.tourId);
  };


  const updateBookingData = (field: keyof BookingData, value: any) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field as string]: "" }));
    }
    console.log("Tour selected")
  };

  // Calendar Display for Section 1
  const CustomCalendar: React.FC<CustomCalendarProps> = ({ selectedDate, onDateSelect, tourData, isDateAvailable }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };
  
  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
  
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };
  
  const formatDateString = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  
  const isDateDisabled = (day: number): boolean => {
    const dateStr = formatDateString(year, month, day);
    const dateObj = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (dateObj < today) return true;
    
    // If no tour selected, enable all future dates
    if (!tourData) return false;
    
    // Check availability using the provided function
    const validation = isDateAvailable(dateStr, tourData);
    return !validation.available;
  };
  
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Create array of days to render
  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  return (
    <div className="border-2 border-blue-500 rounded-xl p-6 bg-white shadow-lg">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-blue-500 hover:text-white rounded-lg transition-all text-blue-600"
          type="button"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h3 className="text-xl font-bold text-blue-600">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-blue-500 hover:text-white rounded-lg transition-all text-blue-600"
          type="button"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
      
      {/* Day Names */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-bold text-blue-700 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }
          
          const dateStr = formatDateString(year, month, day);
          const isSelected = selectedDate === dateStr;
          const isDisabled = isDateDisabled(day);
          
          return (
            <button
              key={day}
              type="button"
              onClick={() => !isDisabled && onDateSelect(dateStr)}
              disabled={isDisabled}
              className={`
                aspect-square p-2 rounded-lg text-sm font-semibold transition-all
                ${isSelected 
                  ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-500' 
                  : ''
                }
                ${!isSelected && !isDisabled 
                  ? 'bg-blue-50 hover:bg-blue-100 text-gray-800 border-2 border-blue-200 hover:border-blue-400' 
                  : ''
                }
                ${isDisabled 
                  ? 'text-gray-300 cursor-not-allowed bg-gray-50 opacity-50' 
                  : 'cursor-pointer'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      {tourData && (
        <div className="mt-6 pt-4 border-t-2 border-blue-200 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-blue-500 shadow-md ring-2 ring-blue-500"></div>
            <span className="font-medium text-blue-800">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-gray-50 border-2 border-gray-300"></div>
            <span className="font-medium text-gray-600">Unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
};

  // Preselect the tour from param once tours are loaded
  useEffect(() => {
    console.log("EFFECT deps -> preselectedTour:", preselectedTour, "tours.length:", tours.length);
    if (!preselectedTour || !tours.length) return;
    selectTourById(preselectedTour.trim());
  }, [preselectedTour, tours]);

    // ---------- Helpers for Section 2 ----------
  const toMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const toDisplayTime = (mins: number) => {
    const hours24 = Math.floor(mins / 60);
    const minutes = mins % 60;
    const ampm = hours24 >= 12 ? "PM" : "AM";
    const hours12 = ((hours24 + 11) % 12) + 1;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const generateTimeSlots = (start: string, end: string, duration: number, frequency: number) => {
    const startMins = toMinutes(start);
    const endMins = toMinutes(end);
    const slots: string[] = [];
    for (let mins = startMins; mins + duration <= endMins; mins += frequency) {
      slots.push(toDisplayTime(mins));
    }
    return slots;
  };

const isDateAvailable = (dateString: string, tour: Tour): { available: boolean; reason?: string } => {
  if (!dateString) {
    return { available: false, reason: "Please select a date" };
  }

  const selectedDate = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if date is in the past
  if (selectedDate < today) {
    return { available: false, reason: "Cannot book past dates" };
  }

  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[selectedDate.getDay()];

  // Check if date falls within any dateSpecificDays range
  const isInDateRange = tour.dateSpecificDays?.some(range => {
    const start = new Date(range.startDate);
    const end = new Date(range.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return selectedDate >= start && selectedDate <= end;
  });

  // Check if the day of week has available hours in weeklyHours
  const hasWeeklyHours = tour.weeklyHours?.[dayOfWeek]?.length > 0;

  // Date must either be in a date range OR have weekly hours for that day
  if (!isInDateRange && !hasWeeklyHours) {
    return { 
      available: false, 
      reason: "Unable to book on this day. Please select an available date." 
    };
  }

  // Check dateSpecificBlockDays for unavailable dates
  const dateSpecific = tour.dateSpecificBlockDays?.find(d => d.date === dateString);
  if (dateSpecific?.unavailable) {
    return { 
      available: false, 
      reason: "This date is unavailable for bookings." 
    };
  }

  return { available: true };
};

  // ---------- Validation ----------
  const validateSection = (section: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (section) {
      case 1:
        if (!bookingData.tourId) newErrors.tourType = "Please select a tour type";
        if (!bookingData.date) newErrors.date = "Please select a date";
        break;
      case 2:
        if (!bookingData.time) newErrors.time = "Please select a time slot";
        if (bookingData.maxAttendees < 1) newErrors.maxAttendees = "Group size must be at least 1";
        break;
      case 3:
        if (!bookingData.firstName) newErrors.firstName = "First name is required";
        if (!bookingData.lastName) newErrors.lastName = "Last name is required";
        if (!bookingData.email) newErrors.contactEmail = "Email is required";
        if (!bookingData.phone) newErrors.contactPhone = "Phone number is required";
        if (!bookingData.organization) newErrors.organization = "Organization is required";
        if (!bookingData.role) newErrors.role = "Role is required";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------- Section nav ----------
  const nextSection = () => {
    if (validateSection(currentSection)) {
      setCurrentSection((s) => Math.min(s + 1, 3));
    }
  };

  const prevSection = () => setCurrentSection((s) => Math.max(s - 1, 1));

  // ---------- Submit ----------
const handleSubmit = async () => {
  if (!validateSection(currentSection)) return;

  try {
    // 1) Save booking to Firestore (as you already do)
    const bookingsRef = collection(db, "Bookings");
    const newDocRef = doc(bookingsRef);
    const bookingWithId = {
      ...bookingData,
      id: newDocRef.id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDocRef, bookingWithId);

    // 2) Build start/end Date from form + selected tour duration
    const selected = tours.find((t) => t.tourId === bookingData.tourId);
    if (!selected) throw new Error("Selected tour not found.");

    const durationMins =
      selected.durationUnit === "hours" ? selected.duration * 60 : selected.duration;

    if (!bookingData.date || !bookingData.time) {
      throw new Error("Missing date or time.");
    }

    const startLocal = parseLocalDateTime(bookingData.date, bookingData.time);
    const endLocal = addMinutes(startLocal, durationMins);

    const startISO = toLocalISO(startLocal);
    const endISO = toLocalISO(endLocal);

    let calendarEventLink = "";

    await api.post('/book-tour/', bookingData);
    console.log('bookingData', bookingData)

    // 4) Prepare data for confirmation page
    const confirmationData = {
      id: bookingWithId.id,
      tourTitle: selected.title,
      date: bookingData.date,
      time: bookingData.time,
      duration: selected.duration,
      durationUnit: selected.durationUnit,
      groupSize: bookingData.maxAttendees,
      firstName: bookingData.firstName,
      lastName: bookingData.lastName,
      email: bookingData.email,
      phone: bookingData.phone,
      organization: bookingData.organization,
      role: bookingData.role,
      location: selected.location,
      zoomLink: selected.zoomLink,
      calendarEventLink,
      createdAt: bookingWithId.createdAt,
    };

    // 5) Navigate to confirmation page with booking data
    navigate("/booking-confirmation", { 
      state: { bookingData: confirmationData },
      replace: true 
    });

  } catch (error) {
    console.error("Error during submission:", error);
    alert("Failed to submit booking. Please try again.");
  }
};

  // ---------- Renderers for Sections ----------
  const renderSectionIndicator = () => (
    <div className="flex items-start justify-center mb-8">
      {sections.map((section, index) => (
        <div key={section.id} className="flex items-center">
          <div className="text-center flex flex-col items-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${section.id <= currentSection ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
            >
              {section.id < currentSection ? <Check className="w-6 h-6" /> : section.id}
            </div>
            <div className="text-center w-32">
              <p
                className={`text-sm font-medium ${section.id <= currentSection ? "text-blue-600" : "text-gray-500"
                  }`}
              >
                {section.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">{section.description}</p>
            </div>
          </div>
          {index < sections.length - 1 && (
            <div
              className={`w-20 h-1 mx-4 mt-6 flex-shrink-0 ${section.id < currentSection ? "bg-blue-600" : "bg-gray-200"
                }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderSection1 = () => {
  const selectedTourData = tours.find((t) => t.tourId === bookingData.tourId);

  // Calculate min/max date based on dateSpecificDays range and 24-hour notice
  const getDateRange = () => {
    if (!selectedTourData) return { minDate: null, maxDate: null };

    const now = new Date();
    
    // Calculate 24-hour minimum from now
    let minNoticeDate = new Date(now);
    minNoticeDate.setDate(minNoticeDate.getDate() + 1);
    minNoticeDate.setHours(0, 0, 0, 0);

    // Get dateSpecificDays range if it exists
    let rangeMinDate = null;
    let rangeMaxDate = null;

    if (selectedTourData.dateSpecificDays && selectedTourData.dateSpecificDays.length > 0) {
      // Find the earliest startDate and latest endDate in the array
      const dates = selectedTourData.dateSpecificDays.map(d => ({
        start: new Date(d.startDate + 'T00:00:00'),
        end: new Date(d.endDate + 'T00:00:00')
      }));

      rangeMinDate = new Date(Math.min(...dates.map(d => d.start.getTime())));
      rangeMaxDate = new Date(Math.max(...dates.map(d => d.end.getTime())));

      console.log('dateSpecificDays range:', rangeMinDate.toDateString(), 'to', rangeMaxDate.toDateString());
    }
    

    // Use the later of: 24-hour notice or range start date
    let minDate = minNoticeDate;
    if (rangeMinDate && rangeMinDate > minNoticeDate) {
      minDate = rangeMinDate;
    }

    // Use range end date if it exists, otherwise calculate from maxNotice
    let maxDate = rangeMaxDate;
    if (!maxDate) {
      maxDate = new Date(now);
      switch (selectedTourData.maxNoticeUnit) {
        case 'days':
          maxDate.setDate(maxDate.getDate() + selectedTourData.maxNotice);
          break;
        case 'weeks':
          maxDate.setDate(maxDate.getDate() + (selectedTourData.maxNotice * 7));
          break;
        case 'months':
          maxDate.setMonth(maxDate.getMonth() + selectedTourData.maxNotice);
          break;
      }
    }

    console.log('Final date range - min:', minDate?.toDateString(), 'max:', maxDate?.toDateString());


    return { minDate, maxDate };
  };

  const { minDate, maxDate } = getDateRange();

  // Helper to check if a date has any available time slots
  const hasAvailableTimeSlots = (dateStr: string): boolean => {
    if (!selectedTourData) return false;
    
    const now = new Date();
    const minDateTime = new Date(now);
    minDateTime.setHours(minDateTime.getHours() + 24);
    
    // Get duration and frequency
    const durationMins =
      selectedTourData.durationUnit === "hours" || selectedTourData.durationUnit === "hour" 
        ? selectedTourData.duration * 60 
        : selectedTourData.duration;
    
    const frequencyMins =
      selectedTourData.frequencyUnit === "hours" || selectedTourData.frequencyUnit === "hour"
        ? selectedTourData.frequency * 60 
        : selectedTourData.frequency;
    
    // Check for date-specific hours first
    const dateSpecific = selectedTourData.dateSpecificBlockDays?.find(
      (d) => d.date === dateStr && !d.unavailable
    );
    
    let allTimeSlots: string[] = [];
    
    if (dateSpecific && dateSpecific.slots) {
      allTimeSlots = dateSpecific.slots.flatMap((slot) =>
        generateTimeSlots(slot.start, slot.end, durationMins, frequencyMins)
      );
    } else {
      // Fall back to weekly hours
      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      
      const weekly = selectedTourData.weeklyHours?.[dayOfWeek];
      
      if (weekly && weekly.length > 0) {
        allTimeSlots = weekly.flatMap((slot) =>
          generateTimeSlots(slot.start, slot.end, durationMins, frequencyMins)
        );
      }
    }
    
    // Check if any slots meet the 24-hour requirement and aren't full
    return allTimeSlots.some(time => {
      const [timePart, period] = time.split(' ');
      const [hours, minutes] = timePart.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      const slotDateTime = new Date(dateStr + 'T00:00:00');
      slotDateTime.setHours(hour24, minutes, 0, 0);
      
      // Check if slot is at least 24 hours away
      if (slotDateTime < minDateTime) return false;
      
      // Check if slot is not full
      const bookingCount = bookings.filter(
        (booking: Booking) => 
          booking.tourId === selectedTourData.tourId && 
          booking.date === dateStr && 
          booking.time === time
      ).length;
      const maxBookings = selectedTourData.maxBookings || 1;
      
      return bookingCount < maxBookings;
    });
  };

  // Enhanced date validation
  const isDateInRange = (dateStr: string): boolean => {
    if (!minDate || !maxDate) return true;
    
    const date = new Date(dateStr + 'T00:00:00');
    return date >= minDate && date <= maxDate;
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Tour Experience</h2>
        <p className="text-gray-600">Select the tour that best matches your interests and preferred date</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Available Tours</h3>
        <div className="grid gap-6">
          {selectedTour ? (
            // Show only the selected tour
            selectedTourData && (
              <div className="tour-card selected">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-indigo-600 mb-2">{selectedTourData.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{selectedTourData.description}</p>
                    <div className="text-sm text-gray-700 space-y-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {selectedTourData.duration} {selectedTourData.durationUnit}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Max {selectedTourData.maxAttendeesPerBooking} people
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTour(null);
                      setBookingData(prev => ({ ...prev, tourId: "", tourType: "" }));
                    }}
                    className="text-gray-600 hover:text-gray-900 text-sm underline"
                  >
                    Change Tour
                  </button>
                </div>
              </div>
            )
          ) : (
            // Show all tours when none is selected
            tours.map((tour) => (
              <div key={tour.tourId} className="tour-card">
                <h3 className="text-lg font-semibold text-indigo-600 mb-2">{tour.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{tour.description}</p>
                <div className="text-sm text-gray-700 space-y-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {tour.duration} {tour.durationUnit}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Max {tour.maxAttendeesPerBooking} people
                  </span>
                </div>
                <button
                  onClick={() => selectTourById(tour.tourId)}
                  className="mt-4 px-4 py-2 rounded-lg font-semibold bg-gray-200 text-gray-700 hover:bg-blue-100"
                >
                  Select This Tour
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {errors.tourType && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
          <AlertCircle className="w-4 w-4" />
          {errors.tourType}
        </p>
      )}

      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-4">Preferred Date</label>
        <CustomCalendar
          selectedDate={bookingData.date}
          onDateSelect={(date) => {
            updateBookingData("date", date);
            
            // Validate immediately if a tour is selected
            if (selectedTourData) {
              // Check date range first
              if (!isDateInRange(date)) {
                setErrors(prev => ({ 
                  ...prev, 
                  date: `Please select a date between ${minDate?.toLocaleDateString()} and ${maxDate?.toLocaleDateString()}`
                }));
                return;
              }

              const validation = isDateAvailable(date, selectedTourData);
              if (!validation.available) {
                setErrors(prev => ({ ...prev, date: validation.reason || "Unable to book on this day. Please select an available date." }));
              } else {
                setErrors(prev => ({ ...prev, date: "" }));
              }
            }
          }}
          tourData={selectedTourData}
          isDateAvailable={(date, tour) => {
            // First check if date is in valid range
            if (!isDateInRange(date)) {
              return { available: false, reason: "Date is outside the booking window" };
            }
            // Check if date has any available time slots (considering 24-hour notice)
            if (!hasAvailableTimeSlots(date)) {
              return { available: false, reason: "No available time slots for this date" };
            }
            // Then check original availability
            return isDateAvailable(date, tour);
          }}
          minDate={minDate}
          maxDate={maxDate}
        />
        {errors.date && (
          <div className="flex items-center space-x-2 mt-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-red-500 text-sm">{errors.date}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Replace the renderSection2 function with this updated version:

const renderSection2 = () => {
    const selected = tours.find((t) => t.tourId === bookingData.tourId);
    if (!selected) return null;

    // Convert duration to minutes - handles both "hour" and "hours"
    const durationMins =
      selected.durationUnit === "hours" || selected.durationUnit === "hour" 
        ? selected.duration * 60 
        : selected.duration;
    
    // Convert frequency to minutes - handles both "hour" and "hours"
    const frequencyMins =
      selected.frequencyUnit === "hours" || selected.frequencyUnit === "hour"
        ? selected.frequency * 60 
        : selected.frequency;

    // Calculate minimum allowed datetime (24 hours from now)
    const getMinDateTime = () => {
      const now = new Date();
      const minDateTime = new Date(now);
      minDateTime.setHours(minDateTime.getHours() + 24); // Always 24 hours ahead
      return minDateTime;
    };

    // Check if a specific time slot meets 24-hour minimum notice requirement
    const isTimeSlotValid = (time: string) => {
      const minDateTime = getMinDateTime();
      const [timePart, period] = time.split(' ');
      const [hours, minutes] = timePart.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      const slotDateTime = new Date(bookingData.date + 'T00:00:00');
      slotDateTime.setHours(hour24, minutes, 0, 0);
      
      return slotDateTime >= minDateTime;
    };

    // Count bookings for a specific date and time
    const getBookingCount = (date: string, time: string): number => {
      return bookings.filter(
        (booking: Booking) => 
          booking.tourId === selected.tourId && 
          booking.date === date && 
          booking.time === time
      ).length;
    };

    // Check if a time slot is full
    const isTimeSlotFull = (time: string): boolean => {
      const date = bookingData.date;
      if (!date) return false;
      
      const bookingCount = getBookingCount(date, time);
      const maxBookings = selected.maxBookings || 1;
      
      return bookingCount >= maxBookings;
    };

    const getAvailableTimes = () => {
      const date = bookingData.date;
      if (!date) return [];
      
      console.log("Selected date:", date);
      console.log("Tour weeklyHours:", selected.weeklyHours);
      
      // Check for date-specific hours first
      const dateSpecific = selected.dateSpecificBlockDays?.find(
        (d) => d.date === date && !d.unavailable
      );
      
      let allTimeSlots: string[] = [];
      
      if (dateSpecific && dateSpecific.slots) {
        console.log("Using date-specific slots:", dateSpecific.slots);
        allTimeSlots = dateSpecific.slots.flatMap((slot) =>
          generateTimeSlots(slot.start, slot.end, durationMins, frequencyMins)
        );
      } else {
        // Fall back to weekly hours
        const dateObj = new Date(date + 'T00:00:00');
        const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
        console.log("Day of week:", dayOfWeek);
        
        const weekly = selected.weeklyHours?.[dayOfWeek];
        console.log("Weekly hours for", dayOfWeek, ":", weekly);
        
        if (weekly && weekly.length > 0) {
          allTimeSlots = weekly.flatMap((slot) =>
            generateTimeSlots(slot.start, slot.end, durationMins, frequencyMins)
          );
          console.log("Generated time slots:", allTimeSlots);
        }
      }
      
      // Filter out:
      // 1. Time slots that are full
      // 2. Time slots that don't meet minimum notice requirement
      const availableSlots = allTimeSlots.filter(time => 
        !isTimeSlotFull(time) && isTimeSlotValid(time)
      );
      console.log("Available (non-full, valid notice) slots:", availableSlots);
      
      return availableSlots;
    };

    const availableTimes = getAvailableTimes();

    const updateGroupSize = (newSize: number) => {
      const maxSize = selected.maxAttendeesPerBooking || 15;
      const finalSize = Math.min(Math.max(1, newSize), maxSize);
      updateBookingData("maxAttendees", finalSize);
    };

    // Get remaining spots for display (optional)
    const getRemainingSpots = (time: string) => {
      const date = bookingData.date;
      if (!date) return selected.maxBookings || 1;
      
      const bookingCount = getBookingCount(date, time);
      const maxBookings = selected.maxBookings || 1;
      
      return Math.max(0, maxBookings - bookingCount);
    };

    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Time Slot</h2>
          <p className="text-gray-600">Choose from available times for your selected tour</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-blue-900">{selected.title}</p>
              <p className="text-blue-700 text-sm">
                {bookingData.date} • {selected.duration} {selected.durationUnit}
              </p>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Time Slots</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {availableTimes.length > 0 ? (
              availableTimes.map((time) => {
                const remainingSpots = getRemainingSpots(time);
                return (
                  <button
                    key={time}
                    onClick={() => updateBookingData("time", time)}
                    className={`p-4 border-2 rounded-lg text-center transition-all hover:shadow-md ${
                      bookingData.time === time
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Clock className="w-5 h-5 mx-auto mb-2 text-gray-600" />
                    <span className="font-medium block">{time}</span>
                    {remainingSpots <= 3 && (
                      <span className="text-xs text-orange-600 mt-1 block">
                        {remainingSpots} spot{remainingSpots !== 1 ? 's' : ''} left
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <p className="col-span-full text-center text-gray-500">
                No available times for this date
              </p>
            )}
          </div>
          {errors.time && <p className="text-red-500 text-sm mt-2">{errors.time}</p>}
        </div>
        
        {/* Group Size Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Size</h3>
          <div className="flex items-center space-x-6">  
            <button
              type="button"
              onClick={() => updateGroupSize(bookingData.maxAttendees - 1)}
              disabled={bookingData.maxAttendees <= 1}
              className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold"
            >
              -
            </button>
            <div className="text-center">
              <span className="text-3xl font-semibold text-gray-900 block">
                {bookingData.maxAttendees}
              </span>
              <span className="text-sm text-gray-500">
                {bookingData.maxAttendees === 1 ? 'person' : 'people'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateGroupSize(bookingData.maxAttendees + 1)}
              disabled={bookingData.maxAttendees >= (selected.maxAttendeesPerBooking || 15)}
              className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold"
            >
              +
            </button>
          </div>
          <p className="text-left text-sm text-gray-500 mt-2"> 
            Maximum {selected.maxAttendeesPerBooking} people per tour
          </p>
          {errors.maxAttendees && (
            <p className="text-red-500 text-sm mt-2 text-left">{errors.maxAttendees}</p>
          )}
        </div>
      </div>
    );
  };

const renderSection3 = () => {
  const majorInterests = [
    { id: 'computer-science', label: 'B.S. Computer Science' },
    { id: 'biomolecular-engineering', label: 'B.S. Biomolecular Engineering' },
    { id: 'bioinformatics', label: 'B.S. Bioinformatics' },
    { id: 'biotechnology', label: 'B.A. Biotechnology' },
    { id: 'applied-mathematics', label: 'B.S. Applied Mathematics' },
    { id: 'network-and-digital-technology', label: 'B.A. Network and Digital Technology' },
    { id: 'game-design', label: 'B.S. Computer Science: Game Design' },
    { id: 'tim', label: 'B.S. Technology and Information Management (TIM)' },
    { id: 'electrical-engineering', label: 'B.S. Electrical Engineering' },
    { id: 'computer-engineering', label: 'B.S. Computer Engineering' },
    { id: 'robotics', label: 'B.S. Robotics Engineering' }
  ];

  const handleInterestChange = (interestId: string, isChecked: boolean) => {
    const currentInterests = bookingData.interests || [];
    let updatedInterests;
    
    if (isChecked) {
      updatedInterests = [...currentInterests, interestId];
    } else {
      updatedInterests = currentInterests.filter(id => id !== interestId);
    }
    
    updateBookingData("interests", updatedInterests);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Booking</h2>
        <p className="text-gray-600">Provide your details and preferences to finalize your tour</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Personal Information
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
            <input
              type="text"
              value={bookingData.firstName}
              onChange={(e) => updateBookingData("firstName", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.firstName ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Enter your first name"
            />
            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
            <input
              type="text"
              value={bookingData.lastName}
              onChange={(e) => updateBookingData("lastName", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.lastName ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Enter your last name"
            />
            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
            <input
              type="email"
              value={bookingData.email}
              onChange={(e) => updateBookingData("email", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.contactEmail ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="your.email@example.com"
            />
            {errors.contactEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
            <input
              type="tel"
              value={bookingData.phone}
              onChange={(e) => updateBookingData("phone", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.contactPhone ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="(555) 123-4567"
            />
            {errors.contactPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.contactPhone}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Background Information
        </h3>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization/School *
            </label>
            <input
              type="text"
              value={bookingData.organization}
              onChange={(e) => updateBookingData("organization", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.organization ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Your school or organization"
            />
            {errors.organization && (
              <p className="text-red-500 text-sm mt-1">{errors.organization}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
            <select
              value={bookingData.role}
              onChange={(e) => updateBookingData("role", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.role ? "border-red-500" : "border-gray-300"
                }`}
            >
              <option value="">Select your role</option>
              <option value="prospective-student">Prospective Student</option>
              <option value="parent">Parent/Guardian</option>
              <option value="counselor">School Counselor</option>
              <option value="teacher">Teacher</option>
              <option value="administrator">Administrator</option>
              <option value="other">Other</option>
            </select>
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
          </div>
        </div>

        {/* Major Interests Section */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Majors Interested Offered Under Baskin
            <span className="text-gray-500 text-xs ml-1">(Select all that apply)</span>
          </label>
          
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3">
            {majorInterests.map((interests) => (
              <label key={interests.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bookingData.interests?.includes(interests.id) || false}
                  onChange={(e) => handleInterestChange(interests.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{interests.label}</span>
              </label>
            ))}
          </div>
          
          {errors.interests && (
            <p className="text-red-500 text-sm mt-2">{errors.interests}</p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">Booking Summary</h4>
        <div className="space-y-2 text-sm text-blue-800">
          <p>
            <span className="font-medium">Tour:</span>{" "}
            {bookingData.tourType || tours.find((t) => t.tourId === bookingData.tourId)?.title}
          </p>
          <p>
            <span className="font-medium">Date & Time:</span> {bookingData.date} at {bookingData.time}
          </p>
          <p>
            <span className="font-medium">Group Size:</span> {bookingData.maxAttendees} people
          </p>
          <p>
            <span className="font-medium">Contact:</span> {bookingData.firstName} {bookingData.lastName}
          </p>
          {bookingData.interests && bookingData.interests.length > 0 && (
            <p>
              <span className="font-medium">Interests:</span>{" "}
              {bookingData.interests
                .map(id => majorInterests.find(interest => interest.id === id)?.label)
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Campus Tour Booking</h1>
            <div className="w-24" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {renderSectionIndicator()}

          <div className="mb-8">
            {currentSection === 1 && renderSection1()}
            {currentSection === 2 && renderSection2()}
            {currentSection === 3 && renderSection3()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <button
              onClick={prevSection}
              disabled={currentSection === 1}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${currentSection === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {currentSection < 3 ? (
              <button
                onClick={nextSection}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Complete Booking
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;