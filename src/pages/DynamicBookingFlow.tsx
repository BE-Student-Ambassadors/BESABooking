import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Calendar, Clock, Users, User, ArrowLeft, ArrowRight, Check, AlertCircle, GraduationCap, ChevronRight, ChevronLeft } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../src/firebase.ts";

type BookingRecord = {
  tourId?: string;
  date?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
};

interface BookingData {
  tourId: string;
  bookingId: string;
  tourType: string;
  date: string;
  startTime: string;
  endTime: string;
  time?: string;
  attendees: number;
  maxAttendees: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  interests: string[];
  timeSlot: string;
  groupSize: number;
  status: string;
  leadGuide: string;
  notes: string;
  besas: string[];
  accommodations?: string;
  largeTourDetails?: string;
}

const besaSupportsTour = (besa: Pick<BesaData, "supportedTourIds">, tourId?: string) => {
  if (!tourId) return true;
  const supportedTourIds = Array.isArray(besa.supportedTourIds) ? besa.supportedTourIds : [];
  if (supportedTourIds.length === 0) return true;
  return supportedTourIds.includes(tourId);
};

{/* Have calendar date show actual available dates (doesn't allow weekends, etc ) */ }
{/* Hide tours not selected*/ }
{/* Scheduling Rules: Show Date Ranges */ }

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

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const normalizeWeeklyHours = (weeklyHours?: WeeklyHours): WeeklyHours =>
  DAYS_OF_WEEK.reduce<WeeklyHours>((acc, day) => {
    acc[day] = [...(weeklyHours?.[day] || [])];
    return acc;
  }, {});

const normalizeAvailabilityRanges = (tourLike: Partial<Tour>): AvailabilityRange[] => {
  if (tourLike.availabilityRanges?.length) {
    return tourLike.availabilityRanges.map((range) => ({
      startDate: range.startDate || "",
      endDate: range.endDate || "",
      weeklyHours: normalizeWeeklyHours(range.weeklyHours),
    }));
  }

  return [{
    startDate: tourLike.startDate || "",
    endDate: tourLike.endDate || "",
    weeklyHours: normalizeWeeklyHours(tourLike.weeklyHours),
  }];
};

const startOfWeek = (date: Date) => {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  base.setDate(base.getDate() - base.getDay());
  return base;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  selectedDate,
  onDateSelect,
  tourData,
  isDateAvailable,
  minDate,
  maxDate,
}) => {
  const getInitialWeekStart = () => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split("-").map(Number);
      if (y && m && d) return startOfWeek(new Date(y, m - 1, d));
    }
    if (minDate) {
      return startOfWeek(new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()));
    }
    return startOfWeek(new Date());
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getInitialWeekStart);

  const mobileDays = Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index));
  const displayedDays = Array.from({ length: 14 }, (_, index) => addDays(currentWeekStart, index));
  const periodEnd = displayedDays[13];
  const mobilePeriodEnd = mobileDays[6];
  const previousMobileWeekStart = addDays(currentWeekStart, -7);
  const nextMobileWeekStart = addDays(currentWeekStart, 7);
  const previousDesktopPeriodStart = addDays(currentWeekStart, -14);
  const nextDesktopPeriodStart = addDays(currentWeekStart, 14);
  const monthRangeLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  const fullMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  });

  const isDateDisabled = (dateObj: Date): boolean => {
    const dateStr = formatDateString(dateObj);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateObj < today) return true;

    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (dateObj < min) return true;
    }
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23, 59, 59, 999);
      if (dateObj > max) return true;
    }

    if (!tourData) return false;

    const validation = isDateAvailable(dateStr, tourData);
    return !validation.available;
  };

  const minWeekStart = minDate
    ? startOfWeek(new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()))
    : null;
  const maxDateTime = maxDate
    ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 23, 59, 59, 999)
    : null;
  const canGoPreviousMobile = !minWeekStart || previousMobileWeekStart >= minWeekStart;
  const canGoNextMobile = !maxDateTime || nextMobileWeekStart <= maxDateTime;
  const canGoPreviousDesktop = !minWeekStart || previousDesktopPeriodStart >= minWeekStart;
  const canGoNextDesktop = !maxDateTime || nextDesktopPeriodStart <= maxDateTime;

  return (
    <div className="border-2 border-blue-500 rounded-2xl p-6 bg-white shadow-lg">
      <div className="mb-6 flex justify-center">
        <div className="flex flex-col items-center gap-1">
          <h3 className="text-xl font-bold text-blue-600">
            {fullMonthLabel.format(currentWeekStart)}
          </h3>
          <p className="hidden text-sm text-gray-500 sm:block">
            {monthRangeLabel.format(currentWeekStart)} - {monthRangeLabel.format(periodEnd)}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Select from the available booking dates.
      </div>

      <div className="sm:hidden">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => canGoPreviousMobile && setCurrentWeekStart(previousMobileWeekStart)}
            className="shrink-0 rounded-full border border-blue-200 p-2 text-blue-600 transition-all hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-blue-600"
            type="button"
            disabled={!canGoPreviousMobile}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            {monthRangeLabel.format(currentWeekStart)} - {monthRangeLabel.format(mobilePeriodEnd)}
          </span>
          <button
            onClick={() => canGoNextMobile && setCurrentWeekStart(nextMobileWeekStart)}
            className="shrink-0 rounded-full border border-blue-200 p-2 text-blue-600 transition-all hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-blue-600"
            type="button"
            disabled={!canGoNextMobile}
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
          {mobileDays.map((dateObj) => {
            const dateStr = formatDateString(dateObj);
            const isSelected = selectedDate === dateStr;
            const isDisabled = isDateDisabled(dateObj);
            const weekdayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const monthLabel = dateObj.toLocaleDateString("en-US", { month: "short" });
            const dayNumber = dateObj.getDate();

            return (
              <button
                key={`mobile-${dateStr}`}
                type="button"
                onClick={() => !isDisabled && onDateSelect(dateStr)}
                disabled={isDisabled}
                className={`
                  min-h-[88px] min-w-[72px] snap-start rounded-xl border px-2 py-2 text-center transition-all
                  ${isSelected ? "bg-blue-500 text-white shadow-lg ring-2 ring-blue-500 border-blue-500" : ""}
                  ${!isSelected && !isDisabled ? "bg-blue-50 text-gray-800 border-blue-200" : ""}
                  ${isDisabled ? "text-gray-300 cursor-not-allowed bg-gray-50 border-gray-200 opacity-60" : "cursor-pointer"}
                `}
              >
                <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "text-blue-100" : "text-blue-700"}`}>
                  {weekdayLabel}
                </div>
                <div className="mt-2 text-2xl font-bold leading-none">
                  {dayNumber}
                </div>
                <div className={`mt-1 text-xs ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                  {monthLabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden items-center gap-3 sm:flex">
        <button
          onClick={() => canGoPreviousDesktop && setCurrentWeekStart(previousDesktopPeriodStart)}
          className="shrink-0 rounded-full border border-blue-200 p-2 text-blue-600 transition-all hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-blue-600"
          type="button"
          disabled={!canGoPreviousDesktop}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="grid flex-1 grid-cols-7 gap-2 overflow-x-auto pb-2">
          {displayedDays.map((dateObj) => {
            const dateStr = formatDateString(dateObj);
            const isSelected = selectedDate === dateStr;
            const isDisabled = isDateDisabled(dateObj);
            const weekdayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const monthLabel = dateObj.toLocaleDateString("en-US", { month: "short" });
            const dayNumber = dateObj.getDate();

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => !isDisabled && onDateSelect(dateStr)}
                disabled={isDisabled}
                className={`
                  min-h-[74px] min-w-[74px] rounded-xl border px-2.5 py-2 text-left transition-all
                  ${isSelected ? "bg-blue-500 text-white shadow-lg ring-2 ring-blue-500 border-blue-500" : ""}
                  ${!isSelected && !isDisabled ? "bg-blue-50 hover:bg-blue-100 text-gray-800 border-blue-200 hover:border-blue-400" : ""}
                  ${isDisabled ? "text-gray-300 cursor-not-allowed bg-gray-50 border-gray-200 opacity-60" : "cursor-pointer"}
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${isSelected ? "text-blue-100" : "text-blue-700"}`}>
                      {weekdayLabel}
                    </div>
                    <div className="mt-1 text-xl font-bold leading-none">
                      {dayNumber}
                    </div>
                    <div className={`mt-1 text-xs ${isSelected ? "text-blue-100" : "text-gray-500"}`}>
                      {monthLabel}
                    </div>
                  </div>
                  {!isDisabled && (
                    <span className={`rounded-full px-1 py-0.5 text-[9px] font-semibold leading-none ${isSelected ? "bg-white/20 text-white" : "bg-white text-blue-700"}`}>
                      Open
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => canGoNextDesktop && setCurrentWeekStart(nextDesktopPeriodStart)}
          className="shrink-0 rounded-full border border-blue-200 p-2 text-blue-600 transition-all hover:bg-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-blue-600"
          type="button"
          disabled={!canGoNextDesktop}
          aria-label="Next week"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {tourData && (
        <div className="mt-6 flex items-center justify-center gap-4 border-t-2 border-blue-200 pt-4 text-sm sm:gap-6">
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

function formatDescriptionInline(text: string) {
  return text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      return <strong key={index}>{part.slice(3, -3)}</strong>;
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function FormattedTourDescription({
  description,
  title,
  compact = false,
}: {
  description: string;
  title: string;
  compact?: boolean;
}) {
  const normalizedDescription = description
    .replace(/\r\n?/g, '\n')
    // A standalone backslash is commonly pasted as a manual paragraph separator.
    .replace(/(?:^|\n)\s*\\\s*(?=\n|$)/g, '\n');
  const blocks = normalizedDescription.split(/\n\s*\n+/).filter((block) => block.trim());

  return (
    <div
      className={`mb-4 space-y-3 overflow-y-auto pr-3 text-sm leading-relaxed text-gray-600 ${compact ? 'max-h-32' : 'max-h-48'}`}
      tabIndex={0}
      aria-label={`${title} description`}
    >
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n').filter((line) => line.trim());

        return (
          <div key={blockIndex} className="space-y-1">
            {lines.map((line, lineIndex) => {
              const headingMatch = line.match(/^\*\*\*(.+?)\*\*\*\s*(.*)$/);
              const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/);

              if (headingMatch) {
                return (
                  <div key={lineIndex} className="space-y-1">
                    <h4 className="text-base font-bold leading-snug text-indigo-700">{headingMatch[1]}</h4>
                    {headingMatch[2] && <p>{formatDescriptionInline(headingMatch[2])}</p>}
                  </div>
                );
              }

              if (bulletMatch) {
                const indent = Math.floor(bulletMatch[1].length / 2);
                return (
                  <div key={lineIndex} className="flex gap-2" style={{ marginLeft: `${indent * 1.25}rem` }}>
                    <span aria-hidden="true">•</span>
                    <span>{formatDescriptionInline(bulletMatch[2])}</span>
                  </div>
                );
              }

              return <p key={lineIndex}>{formatDescriptionInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
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
            maxAttendeesPerBooking: data.maxAttendeesPerBooking ?? data.maxAttendees ?? 5,
            bookingNotice: data.bookingNotice ?? "",
            bannerImageUrl: data.bannerImageUrl ?? "",
            maxBookings: data.maxBookings ?? 3,
            startDate: data.startDate, // ← Add this
            endDate: data.endDate, // ← Add this
            location: data.location ?? "",
            zoomLink: data.zoomLink ?? "",
            autoGenerateZoom: data.autoGenerateZoom ?? false,
            weeklyHours: normalizeWeeklyHours(data.weeklyHours),
            availabilityRanges: normalizeAvailabilityRanges(data),
            dateSpecificBlockDays: data.dateSpecificBlockDays ?? [],
            dateSpecificDays: data.dateSpecificDays ?? [], // ← Add this
            frequency: data.frequency ?? 1,
            frequencyUnit: data.frequencyUnit ?? "hours",
            minNotice: data.minNotice ?? 0,
            minNoticeUnit: data.minNoticeUnit ?? "hours",
            maxNotice: data.maxNotice ?? 1,
            maxNoticeUnit: data.maxNoticeUnit ?? "days",
            cancellationPolicy: data.cancellationPolicy ?? "",
            reschedulingPolicy: data.reschedulingPolicy ?? "",
            intakeForm: data.intakeForm ?? {
              firstName: true,
              lastName: true,
              email: true,
              phone: false,
              attendeeCount: true,
              majorsInterested: false,
              largeTourDetailsEnabled: false,
              largeTourDetailsLabel: 'Please share details about your large in-person group (size, needs, schedule).',
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
  // const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Booking Data State
  const [bookingData, setBookingData] = useState<BookingData>({
    tourId: preselectedTour || "",
    bookingId: "",
    tourType: "",
    date: "",
    startTime: "",
    time: "",
    endTime: "",
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
    accommodations: "",
    largeTourDetails: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [besas, setBesas] = useState<BesaData[]>([]);

  const [apiAvailableTimes, setApiAvailableTimes] = useState<{ time: string; remainingSpots: number }[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

useEffect(() => {
  if (!bookingData.tourId || !bookingData.date) {
    setApiAvailableTimes([]);
    return;
  }
  setLoadingTimes(true);
  getAvailability(bookingData.tourId, bookingData.date)
    .then((res) => setApiAvailableTimes(res.times))
    .catch((err) => {
      console.error("Failed to fetch availability:", err);
      setApiAvailableTimes([]);
    })
    .finally(() => setLoadingTimes(false));
}, [bookingData.tourId, bookingData.date]);



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

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    const len = digits.length;
    if (len <= 3) return digits;
    if (len <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };


  const updateBookingData = (field: keyof BookingData, value: any) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field as string]: "" }));
    }
    console.log("Tour selected")
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

  const isDateInRange = (dateStr: string, start?: string, end?: string): boolean => {
    if (!start) return false;
    const date = new Date(dateStr + "T00:00:00");
    const startDate = new Date(start + "T00:00:00");
    const endDate = end ? new Date(end + "T23:59:59") : new Date(start + "T23:59:59");
    return date >= startDate && date <= endDate;
  };

  const getMatchingAvailabilityRange = (dateStr: string, tour: Tour) =>
    normalizeAvailabilityRanges(tour).find((range) => isDateInRange(dateStr, range.startDate, range.endDate));

  const findDateOverride = (dateStr: string, tour: Tour) =>
    tour.dateSpecificBlockDays?.find((d) => isDateInRange(dateStr, d.startDate, d.endDate));

  const getBookingTime = (booking: BookingRecord): string | undefined =>
    booking.startTime ?? booking.time;

  const getMinutesFromLabel = (label?: string): number | null => {
    if (!label) return null;
    const t24 = parseTime12Hour(label) || label;
    if (!t24.includes(':')) return null;
    return toMinutes(t24);
  };

  const getBlockedSlotRules = (dateStr: string, selectedTour?: Tour) => {
    const blockedTimes = new Set<number>();
    const blockedRanges: Array<{ start: number; end: number }> = [];

    const addBlockedRules = (override?: Tour['dateSpecificBlockDays'][number]) => {
      (override?.blockedTimes || []).forEach((time) => {
        if (!time) return;
        blockedTimes.add(toMinutes(time));
      });

      (override?.blockedRanges || []).forEach((range) => {
        if (!range.start || !range.end) return;
        const start = toMinutes(range.start);
        const end = toMinutes(range.end);
        if (start < 0 || end < 0 || start >= end) return;
        blockedRanges.push({ start, end });
      });
    };

    if (selectedTour) {
      addBlockedRules(findDateOverride(dateStr, selectedTour));
    }

    tours.forEach((tour) => {
      (tour.dateSpecificBlockDays || []).forEach((override) => {
        if (override.appliesToAllTours && isDateWithinOverride(dateStr, override.startDate, override.endDate)) {
          addBlockedRules(override);
        }
      });
    });

    return { blockedTimes, blockedRanges };
  };

  const isSlotBlocked = (
    slotStartMinutes: number,
    slotEndMinutes: number,
    rules: ReturnType<typeof getBlockedSlotRules>
  ) => {
    if (rules.blockedTimes.has(slotStartMinutes)) return true;
    return rules.blockedRanges.some((range) => slotStartMinutes < range.end && range.start < slotEndMinutes);
  };

  const parseTime12Hour = (time12: string) => {
    if (!time12) return "";
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const match = time12.match(timeRegex);
    if (!match) return "";
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && hour !== 12) hour += 12;
    else if (ampm === "AM" && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  };

  const toLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
  };

  const dayMapping = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  } as const;

  const isBesaAvailable = (besa: BesaData, bookingDate: string, bookingTime: string, durationMinutes = 0) => {
    if (!bookingDate || !bookingTime) return false;
    const date = toLocalDate(bookingDate);
    const dayOfWeek = date.getDay() as keyof typeof dayMapping;
    const dayKey = dayMapping[dayOfWeek];
    const dayHours = besa.officeHours[dayKey];
    if (!dayHours || !dayHours.available || dayHours.timeSlots.length === 0) return false;
    const bookingTime24 = parseTime12Hour(bookingTime);
    if (!bookingTime24) return false;
    const bookingStartMins = toMinutes(bookingTime24);
    const bookingEndMins = bookingStartMins + durationMinutes;
    return dayHours.timeSlots.some((slot) => {
      const slotStart = toMinutes(slot.start);
      const slotEnd = toMinutes(slot.end);
      return slotStart <= bookingStartMins && bookingEndMins <= slotEnd;
    });
  };
  const getAutoAssignedBesas = (
    tourId: string,
    bookingDate: string,
    bookingTime: string,
    durationMinutes = 0
  ) => {
    if (!bookingDate || !bookingTime) return [];
    const normalizeRole = (role?: string) => (role || "").toLowerCase();

    const availableBesas = besas.filter(
      (besa) =>
        besa.status === "active" &&
        besaSupportsTour(besa, tourId) &&
        isBesaAvailable(besa, bookingDate, bookingTime, durationMinutes)
    );

    const primaryBesas = availableBesas.filter((besa) => {
      const role = normalizeRole(besa.role);
      return role === "besa" || role === "besa lead";
    });

    const onCallBesas = availableBesas.filter(
      (besa) => normalizeRole(besa.role) === "besa on-call"
    );

    const selectedBesas = [
      ...primaryBesas.slice(0, 2),
      ...onCallBesas.slice(0, Math.max(0, 2 - primaryBesas.length)),
    ].slice(0, 2);

    return selectedBesas.map((besa) => ({
      name: besa.name,
      email: besa.email,
    }));
  };

  const toDateOnly = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value === "string") {
      const d = new Date(value + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    }
    if (value?.seconds) {
      return new Date(value.seconds * 1000);
    }
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    return null;
  };

  const isDateWithinOverride = (dateStr: string, start: string, end?: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const s = new Date(start + "T00:00:00");
    const e = new Date((end || start) + "T23:59:59");
    return d >= s && d <= e;
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

    // Global holiday blocks (appliesToAllTours)
    const globallyBlocked = tours.some((t) =>
      (t.dateSpecificBlockDays || []).some(
        (d) => d.appliesToAllTours && d.unavailable && isDateWithinOverride(dateString, d.startDate, d.endDate)
      )
    );
    if (globallyBlocked) {
      return { available: false, reason: "This date is blocked for all tours (holiday/closure)." };
    }

    // Respect tour start/end window
    const tourStart = toDateOnly(tour.startDate);
    const tourEnd = toDateOnly(tour.endDate);
    if (tourStart) {
      const start = new Date(tourStart);
      start.setHours(0, 0, 0, 0);
      if (selectedDate < start) {
        return { available: false, reason: `Tour starts on ${start.toLocaleDateString()}` };
      }
    }
    if (tourEnd) {
      const end = new Date(tourEnd);
      end.setHours(23, 59, 59, 999);
      if (selectedDate > end) {
        return { available: false, reason: `Tour ends on ${end.toLocaleDateString()}` };
      }
    }

    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[selectedDate.getDay()];

    const matchingRange = getMatchingAvailabilityRange(dateString, tour);
    const hasRangeHours = (matchingRange?.weeklyHours?.[dayOfWeek] || []).length > 0;
    const hasLegacyWeeklyHours = tour.weeklyHours?.[dayOfWeek]?.length > 0;

    if (!hasRangeHours && !hasLegacyWeeklyHours) {
      return {
        available: false,
        reason: "Unable to book on this day. Please select an available date."
      };
    }

    // Check dateSpecificBlockDays for unavailable dates
    const dateSpecific = findDateOverride(dateString, tour);
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
        if (!bookingData.startTime) newErrors.time = "Please select a time slot";
        if (bookingData.maxAttendees < 1) newErrors.maxAttendees = "Group size must be at least 1";
        break;
      case 3:
        if (!bookingData.firstName) newErrors.firstName = "First name is required";
        if (!bookingData.lastName) newErrors.lastName = "Last name is required";
        if (!bookingData.email) newErrors.contactEmail = "Email is required";
        if (!bookingData.phone) {
          newErrors.contactPhone = "Phone number is required";
        } else {
          const digitsOnly = bookingData.phone.replace(/\D/g, "");
          if (digitsOnly.length < 10) {
            newErrors.contactPhone = "Enter a valid phone number with at least 10 digits";
          }
        }
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
  if (isSubmitting) return;
  if (!validateSection(currentSection)) return;
  setIsSubmitting(true);

    try {
      const selected = tours.find((t) => t.tourId === bookingData.tourId);
      if (!selected) throw new Error("Selected tour not found.");

      const durationMins =
        selected.durationUnit === "hours" || selected.durationUnit === "hour"
          ? selected.duration * 60
          : selected.duration;

      if (!bookingData.date || !bookingData.startTime) {
        throw new Error("Missing date or time.");
      }

      const startLocal = parseLocalDateTime(
        bookingData.date,
        bookingData.startTime
      );
      const endLocal = addMinutes(startLocal, durationMins);

      const bookingsRef = collection(db, "Bookings");
      const newDocRef = doc(bookingsRef);
      const bookingId = newDocRef.id;

      const updatedBookingData = {
        ...bookingData,
        bookingId,
        time: bookingData.startTime,
        endTime: endLocal.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        startTimeISO: toLocalISO(startLocal),
        endTimeISO: toLocalISO(endLocal),
        location: selected.location || "Not specified",
      };

      const autoAssignedBesas = getAutoAssignedBesas(
        updatedBookingData.tourId,
        updatedBookingData.date,
        updatedBookingData.startTime,
        durationMins
      );

      const bookingPayload = {
        ...updatedBookingData,
        besas: autoAssignedBesas,
        accommodations: updatedBookingData.accommodations || (updatedBookingData as any).accommodations || "",
        largeTourDetails: updatedBookingData.largeTourDetails || "",
        id: bookingId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(newDocRef, bookingPayload);
      console.log("Booking saved to Firestore with auto-assigned BESAs", bookingPayload);

      const confirmationData = {
        id: bookingId,
        tourTitle: selected.title,
        date: bookingPayload.date,
        time: bookingPayload.time || bookingPayload.startTime,
        startTime: bookingPayload.startTime,
        endTime: bookingPayload.endTime,
        duration: selected.duration,
        durationUnit: selected.durationUnit,
        groupSize: bookingPayload.maxAttendees,
        firstName: bookingPayload.firstName,
        lastName: bookingPayload.lastName,
        email: bookingPayload.email,
        phone: bookingPayload.phone,
        organization: bookingPayload.organization,
        role: bookingPayload.role,
        accommodations: bookingPayload.accommodations,
        location: selected.location,
        zoomLink: selected.zoomLink,
        calendarEventLink: "",
        createdAt: new Date().toISOString(),
      };

      navigate("/booking-confirmation", {
        state: { bookingData: confirmationData },
        replace: true,
      });
    } catch (error) {
      console.error("Error during submission:", error);
      alert("Failed to submit booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

const renderSectionIndicator = () => {
  const progressPct = (currentSection / sections.length) * 100;
  return (
    <>
      <div className="sm:hidden mb-6 px-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-blue-700">
            Step {currentSection} of {sections.length}
          </span>
          <span className="text-xs text-gray-500">
            {sections.find(s => s.id === currentSection)?.title}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="hidden sm:flex items-start justify-start sm:justify-center mb-8 overflow-x-auto gap-4 py-2 px-1 -mx-1">
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
    </>
  );
};

  const renderSection1 = () => {
    const selectedTourData = tours.find((t) => t.tourId === bookingData.tourId);

    // Calculate min/max date based on dateSpecificDays range and 24-hour notice
    const getDateRange = () => {
      if (!selectedTourData) return { minDate: null, maxDate: null };

      const now = new Date();
      const tourStart = toDateOnly(selectedTourData.startDate);
      const tourEnd = toDateOnly(selectedTourData.endDate);

      // Calculate 24-hour minimum from now
      let minNoticeDate = new Date(now);
      minNoticeDate.setDate(minNoticeDate.getDate() + 1);
      minNoticeDate.setHours(0, 0, 0, 0);

      // Get range coverage from availabilityRanges first, then legacy dateSpecificDays
      let rangeMinDate = null;
      let rangeMaxDate = null;

      const availabilityRanges = normalizeAvailabilityRanges(selectedTourData)
        .filter((range) => range.startDate && range.endDate);

      if (availabilityRanges.length > 0) {
        const dates = availabilityRanges.map((range) => ({
          start: new Date(range.startDate + 'T00:00:00'),
          end: new Date(range.endDate + 'T23:59:59')
        }));

        rangeMinDate = new Date(Math.min(...dates.map(d => d.start.getTime())));
        rangeMaxDate = new Date(Math.max(...dates.map(d => d.end.getTime())));
      } else if (selectedTourData.dateSpecificDays && selectedTourData.dateSpecificDays.length > 0) {
        const dates = selectedTourData.dateSpecificDays.map(d => ({
          start: new Date(d.startDate + 'T00:00:00'),
          end: new Date(d.endDate + 'T23:59:59')
        }));

        rangeMinDate = new Date(Math.min(...dates.map(d => d.start.getTime())));
        rangeMaxDate = new Date(Math.max(...dates.map(d => d.end.getTime())));
      }
      let minDate = [minNoticeDate, rangeMinDate, tourStart]
        .filter((d): d is Date => !!d)
        .reduce((max, d) => (d > max ? d : max), minNoticeDate);

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

      // Clamp to tour end date if provided
      if (tourEnd && (!maxDate || tourEnd < maxDate)) {
        const endOfDay = new Date(tourEnd);
        endOfDay.setHours(23, 59, 59, 999);
        maxDate = endOfDay;
      }

      // Guard against inverted ranges
      if (maxDate && maxDate < minDate) {
        maxDate = minDate;
      }

      console.log('Final date range - min:', minDate?.toDateString(), 'max:', maxDate?.toDateString());


      return { minDate, maxDate };
    };

    const { minDate, maxDate } = getDateRange();

    // Helper to check if a date has any available time slots
    const hasAvailableTimeSlots = (dateStr: string): boolean => {
      if (!selectedTourData) return false;

      // Block immediately if globally unavailable
      const globallyBlocked = tours.some((t) =>
        (t.dateSpecificBlockDays || []).some(
          (d) => d.appliesToAllTours && d.unavailable && isDateWithinOverride(dateStr, d.startDate, d.endDate)
        )
      );
      if (globallyBlocked) return false;

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
      const dateSpecific = findDateOverride(dateStr, selectedTourData);

      let allTimeSlots: string[] = [];

      if (dateSpecific?.slots?.length) {
        allTimeSlots = dateSpecific.slots.flatMap((slot) =>
          generateTimeSlots(slot.start, slot.end, durationMins, frequencyMins)
        );
      } else {
        const dateObj = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
        const matchingRange = getMatchingAvailabilityRange(dateStr, selectedTourData);
        const weekly = matchingRange?.weeklyHours?.[dayOfWeek] || selectedTourData.weeklyHours?.[dayOfWeek];

        if (weekly && weekly.length > 0) {
          allTimeSlots = weekly.flatMap((slot) =>
            generateTimeSlots(slot.start, slot.end, durationMins, frequencyMins)
          );
        }
      }

      const blockedSlotRules = getBlockedSlotRules(dateStr, selectedTourData);

      // Check if any slots meet the 24-hour requirement and aren't full
      return allTimeSlots.some(time => {
        const slotMinutes = getMinutesFromLabel(time);
        if (slotMinutes !== null && isSlotBlocked(slotMinutes, slotMinutes + durationMins, blockedSlotRules)) return false;

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
        return true;
      });
    };

    // Enhanced date validation
    const isDateInRange = (dateStr: string): boolean => {
      if (!minDate || !maxDate) return true;

      const date = new Date(dateStr + 'T00:00:00');
      return date >= minDate && date <= maxDate;
    };

    return (
      <div className="space-y-6">
        <div>
          <div className="grid gap-6">
            {selectedTour ? (
              // Show only the selected tour
              selectedTourData && (
                <div className="tour-card selected">
                  {selectedTourData.bannerImageUrl?.trim() && (
                    <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm">
                      <img
                        src={selectedTourData.bannerImageUrl}
                        alt={`${selectedTourData.title} banner`}
                        className="block h-auto w-full"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-indigo-600 mb-2">{selectedTourData.title}</h3>
                      <FormattedTourDescription
                        description={selectedTourData.description}
                        title={selectedTourData.title}
                      />
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
                  <FormattedTourDescription description={tour.description} title={tour.title} compact />
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

        {selectedTourData?.bookingNotice?.trim() && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
            <p className="font-semibold">Before you book</p>
            <p className="mt-1 whitespace-pre-line leading-6">{selectedTourData.bookingNotice.trim()}</p>
          </div>
        )}

        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-4">Preferred Date</label>
          <CustomCalendar
            selectedDate={bookingData.date}
            onDateSelect={(date) => {
              const nextDate = bookingData.date === date ? "" : date;

              setBookingData((prev) => ({
                ...prev,
                date: nextDate,
                startTime: "",
                time: "",
                endTime: "",
              }));

              if (!nextDate) {
                setErrors((prev) => ({ ...prev, date: "", time: "" }));
                return;
              }

              // Validate immediately if a tour is selected
              if (selectedTourData) {
                // Check date range first
                if (!isDateInRange(nextDate)) {
                  setErrors(prev => ({
                    ...prev,
                    date: `Please select a date between ${minDate?.toLocaleDateString()} and ${maxDate?.toLocaleDateString()}`
                  }));
                  return;
                }

                const validation = isDateAvailable(nextDate, selectedTourData);
                if (!validation.available) {
                  setErrors(prev => ({ ...prev, date: validation.reason || "Unable to book on this day. Please select an available date." }));
                } else {
                  setErrors(prev => ({ ...prev, date: "", time: "" }));
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

  const remainingSpotsByTime = Object.fromEntries(
    apiAvailableTimes.map((t) => [t.time, t.remainingSpots])
  );
  const availableTimes = apiAvailableTimes.map((t) => t.time);

  const updateGroupSize = (newSize: number) => {
    const maxSize = selected.maxAttendeesPerBooking || 15;
    const finalSize = Math.min(Math.max(1, newSize), maxSize);
    updateBookingData("maxAttendees", finalSize);
  };

  const handleGroupSizeInput = (value: string) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      updateBookingData("maxAttendees", 1);
      return;
    }
    updateGroupSize(parsed);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Time Slot</h2>
        <p className="text-gray-600">Choose from available times for your selected tour</p>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Calendar className="w-5 h-5 text-white" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Time Slots</h3>
          {selected.maxAttendeesPerBooking >= 5 && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <p>
                Each time slot reserves one family. You can include up to 5 family members in a single booking.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {availableTimes.length > 0 ? (
              availableTimes.map((time) => {
                const remainingSpots = getRemainingSpots(time);
                return (
                  <button
                    key={time}
                    onClick={() => {
                      updateBookingData("startTime", time);
                      updateBookingData("time", time);
                    }}
                    className={`p-3 border-2 rounded-lg text-center transition-all hover:shadow-md ${bookingData.startTime === time
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <Clock className="w-4 h-4 mx-auto mb-2 text-gray-600" />
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
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Time Slots</h3>
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p>
            Each time slot reserves one family. You can include up to 5 family members in a single booking.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {loadingTimes ? (
            <p className="col-span-full text-center text-gray-500">Loading times...</p>
          ) : availableTimes.length > 0 ? (
            availableTimes.map((time) => {
              const remainingSpots = remainingSpotsByTime[time] ?? 0;
              return (
                <button
                  key={time}
                  onClick={() => {
                    updateBookingData("startTime", time);
                    updateBookingData("time", time);
                  }}
                  className={`p-3 border-2 rounded-lg text-center transition-all hover:shadow-md ${bookingData.startTime === time
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-2 text-gray-600" />
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

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Size</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <input
            type="number"
            min={1}
            max={selected.maxAttendeesPerBooking || 15}
            value={bookingData.maxAttendees}
            onChange={(e) => handleGroupSizeInput(e.target.value)}
            className="w-full sm:w-48 px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg text-center"
            inputMode="numeric"
          />
          <div className="text-sm text-gray-600">
            <p className="font-medium">Enter the total number of attendees.</p>
            <p>Maximum of {selected.maxAttendeesPerBooking} attendees per tour.</p>
          </div>
        </div>
        {errors.maxAttendees && (
          <p className="text-red-500 text-sm mt-2 text-left">{errors.maxAttendees}</p>
        )}
      </div>
    </div>
  );
};

  const renderSection3 = () => {
    const majorInterests = [
      { id: 'applied-mathematics', label: 'Applied Mathematics' },
      { id: 'biomolecular-engineering', label: 'Biomolecular Engineering' },
      { id: 'bioinformatics', label: 'Bioinformatics' },
      { id: 'biotechnology', label: 'Biotechnology' },
      { id: 'computer-engineering', label: 'Computer Engineering' },
      { id: 'computer-science', label: 'Computer Science' },
      { id: 'computer-science-game-design', label: 'Computer Science: Game Design' },
      { id: 'computational-media', label: 'Computational Media' },
      { id: 'electrical-engineering', label: 'Electrical Engineering' },
      { id: 'network-and-digital-technology', label: 'Network and Digital Technology' },
      { id: 'robotics-engineering', label: 'Robotics Engineering' },
      { id: 'tim', label: 'Technology and Information Management (TIM)' }
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

    const selectedTourData = tours.find((t) => t.tourId === bookingData.tourId);
    const largeDetailsEnabled = selectedTourData?.intakeForm?.largeTourDetailsEnabled;
    const largeDetailsLabel =
      selectedTourData?.intakeForm?.largeTourDetailsLabel ||
      "Please share details about your large in-person group (size, needs, schedule).";

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
                onChange={(e) => updateBookingData("phone", formatPhoneNumber(e.target.value))}
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

          {largeDetailsEnabled && (
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {largeDetailsLabel}
              </label>
              <textarea
                value={bookingData.largeTourDetails || ""}
                onChange={(e) => updateBookingData("largeTourDetails", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                placeholder="Share group size, schedule constraints, accessibility needs, etc."
              />
            </div>
          )}

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

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Accommodations & Special Requests
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Tell us about any accommodations we should prepare.
          </p>
          <textarea
            value={bookingData.accommodations || ""}
            onChange={(e) => updateBookingData("accommodations", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
            placeholder="Example: wheelchair access, ASL interpreter, mobility assistance, or other notes"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-3">Booking Summary</h4>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              <span className="font-medium">Tour:</span>{" "}
              {bookingData.tourType || tours.find((t) => t.tourId === bookingData.tourId)?.title}
            </p>
            <p>
              <span className="font-medium">Date & Time:</span> {bookingData.date} at {bookingData.startTime}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-left sm:text-center flex-1">
              Campus Tour Booking
            </h1>
            <div className="w-24 hidden sm:block" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
          {renderSectionIndicator()}

          <div className="mb-8">
            {currentSection === 1 && renderSection1()}
            {currentSection === 2 && renderSection2()}
            {currentSection === 3 && renderSection3()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between pt-6 border-t">
            <button
              onClick={prevSection}
              disabled={currentSection === 1}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${currentSection === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                } w-full sm:w-auto`}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {currentSection < 3 ? (
              <button
                onClick={nextSection}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors w-full sm:w-auto ${isSubmitting
                  ? "bg-green-300 text-white cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
                  }`}
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? "Booking..." : "Complete Booking"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
