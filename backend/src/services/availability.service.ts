import { db } from "../config/firebaseAdmin.js";
import { toursRepository } from "../repositories/tours.repository.js";
import { AppError } from "../utils/errors.js";

type BookingLike = Record<string, unknown> & {
  id?: string;
  bookingId?: string;
  tourId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
};

type TimeSlotOption = {
  time: string;
  remainingSpots: number;
};

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function normalizeWeeklyHours(weeklyHours?: WeeklyHours): WeeklyHours {
  return DAYS_OF_WEEK.reduce<WeeklyHours>((acc, day) => {
    acc[day] = [...(weeklyHours?.[day] || [])];
    return acc;
  }, {});
}

function normalizeAvailabilityRanges(tourLike: Partial<Tour>): AvailabilityRange[] {
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
}

function isDateInRange(dateStr: string, start?: string, end?: string) {
  if (!start) return false;
  const date = new Date(`${dateStr}T00:00:00`);
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = end ? new Date(`${end}T23:59:59`) : new Date(`${start}T23:59:59`);
  return date >= startDate && date <= endDate;
}

function isDateWithinOverride(dateStr: string, start: string, end?: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end || start}T23:59:59`);
  return date >= startDate && date <= endDate;
}

function findDateOverride(dateStr: string, tour: Tour) {
  return tour.dateSpecificBlockDays?.find((override) => isDateInRange(dateStr, override.startDate, override.endDate));
}

function getMatchingAvailabilityRange(dateStr: string, tour: Tour) {
  return normalizeAvailabilityRanges(tour).find((range) => isDateInRange(dateStr, range.startDate, range.endDate));
}

function toMinutes(timeStr: string) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return -1;
  return hours * 60 + minutes;
}

function parseTime12Hour(time12?: string) {
  if (!time12) return "";
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  let hour = Number.parseInt(match[1] || "0", 10);
  const minute = match[2] || "00";
  const meridiem = (match[3] || "").toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function toDisplayTime(minutes: number) {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = ((hours24 + 11) % 12) + 1;
  return `${hours12}:${String(mins).padStart(2, "0")} ${meridiem}`;
}

function generateTimeSlots(start: string, end: string, duration: number, frequency: number) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  const slots: string[] = [];
  for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += frequency) {
    slots.push(toDisplayTime(minutes));
  }
  return slots;
}

function getTourDurationMinutes(tour: Tour) {
  return tour.durationUnit === "hours" || tour.durationUnit === "hour"
    ? tour.duration * 60
    : tour.duration;
}

function getTourFrequencyMinutes(tour: Tour) {
  return tour.frequencyUnit === "hours" || tour.frequencyUnit === "hour"
    ? tour.frequency * 60
    : tour.frequency;
}

function getBlockedSlotRules(dateStr: string, selectedTour: Tour, tours: Tour[]) {
  const blockedTimes = new Set<number>();
  const blockedRanges: Array<{ start: number; end: number }> = [];

  const addBlockedRules = (override?: Tour["dateSpecificBlockDays"][number]) => {
    (override?.blockedTimes || []).forEach((time) => {
      if (!time) return;
      const minutes = toMinutes(time);
      if (minutes >= 0) blockedTimes.add(minutes);
    });

    (override?.blockedRanges || []).forEach((range) => {
      if (!range.start || !range.end) return;
      const start = toMinutes(range.start);
      const end = toMinutes(range.end);
      if (start >= 0 && end > start) blockedRanges.push({ start, end });
    });
  };

  addBlockedRules(findDateOverride(dateStr, selectedTour));

  tours.forEach((tour) => {
    (tour.dateSpecificBlockDays || []).forEach((override) => {
      if (override.appliesToAllTours && isDateWithinOverride(dateStr, override.startDate, override.endDate)) {
        addBlockedRules(override);
      }
    });
  });

  return { blockedTimes, blockedRanges };
}

function isSlotBlocked(
  slotStartMinutes: number,
  slotEndMinutes: number,
  rules: ReturnType<typeof getBlockedSlotRules>,
) {
  if (rules.blockedTimes.has(slotStartMinutes)) return true;
  return rules.blockedRanges.some((range) => slotStartMinutes < range.end && range.start < slotEndMinutes);
}

function getBookingId(booking: BookingLike) {
  if (typeof booking.bookingId === "string" && booking.bookingId.trim() !== "") return booking.bookingId;
  if (typeof booking.id === "string" && booking.id.trim() !== "") return booking.id;
  return "";
}

function getBookingStartMinutes(booking: BookingLike) {
  const start =
    typeof booking.startTime === "string" && booking.startTime.trim() !== ""
      ? booking.startTime
      : typeof booking.time === "string"
        ? booking.time
        : "";
  const parsed = parseTime12Hour(start) || start;
  return parsed.includes(":") ? toMinutes(parsed) : -1;
}

function getBookingEndMinutes(booking: BookingLike, fallbackTour?: Tour) {
  const end = typeof booking.endTime === "string" ? booking.endTime : "";
  const parsedEnd = parseTime12Hour(end) || end;
  if (parsedEnd.includes(":")) {
    return toMinutes(parsedEnd);
  }

  const startMinutes = getBookingStartMinutes(booking);
  if (startMinutes < 0 || !fallbackTour) return -1;
  return startMinutes + getTourDurationMinutes(fallbackTour);
}

function bookingsOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function canToursOverlap(leftTour?: Tour, rightTour?: Tour) {
  return Boolean(leftTour?.allowConcurrentTours) && Boolean(rightTour?.allowConcurrentTours);
}

function getDateAvailabilityReason(dateString: string, tour: Tour, tours: Tour[]) {
  if (!dateString) {
    return "Please select a date";
  }

  const selectedDate = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return "Cannot book past dates";
  }

  const globallyBlocked = tours.some((entry) =>
    (entry.dateSpecificBlockDays || []).some(
      (override) =>
        override.appliesToAllTours &&
        override.unavailable &&
        isDateWithinOverride(dateString, override.startDate, override.endDate),
    ),
  );
  if (globallyBlocked) {
    return "This date is blocked for all tours (holiday/closure).";
  }

  if (tour.startDate && selectedDate < new Date(`${tour.startDate}T00:00:00`)) {
    return `Tour starts on ${new Date(`${tour.startDate}T00:00:00`).toLocaleDateString("en-US")}`;
  }

  if (tour.endDate && selectedDate > new Date(`${tour.endDate}T23:59:59`)) {
    return `Tour ends on ${new Date(`${tour.endDate}T00:00:00`).toLocaleDateString("en-US")}`;
  }

  const dayOfWeek = DAYS_OF_WEEK[selectedDate.getDay()];
  const matchingRange = getMatchingAvailabilityRange(dateString, tour);
  const hasRangeHours = (matchingRange?.weeklyHours?.[dayOfWeek] || []).length > 0;
  const hasLegacyHours = (tour.weeklyHours?.[dayOfWeek] || []).length > 0;

  if (!hasRangeHours && !hasLegacyHours) {
    return "Unable to book on this day. Please select an available date.";
  }

  const dateSpecific = findDateOverride(dateString, tour);
  if (dateSpecific?.unavailable) {
    return "This date is unavailable for bookings.";
  }

  return undefined;
}

function getBaseTimeSlotsForDate(dateStr: string, tour: Tour, tours: Tour[]) {
  const durationMinutes = getTourDurationMinutes(tour);
  const frequencyMinutes = getTourFrequencyMinutes(tour);
  if (durationMinutes <= 0 || frequencyMinutes <= 0) {
    return [];
  }

  const override = findDateOverride(dateStr, tour);
  const dayName = new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
  const matchingRange = getMatchingAvailabilityRange(dateStr, tour);
  const hours = override?.slots?.length
    ? override.slots
    : matchingRange?.weeklyHours?.[dayName] || tour.weeklyHours?.[dayName] || [];
  const blockedRules = getBlockedSlotRules(dateStr, tour, tours);

  return hours
    .flatMap((slot) => generateTimeSlots(slot.start, slot.end, durationMinutes, frequencyMinutes))
    .filter((time) => {
      const parsed = parseTime12Hour(time);
      const startMinutes = parsed ? toMinutes(parsed) : -1;
      if (startMinutes < 0) return false;
      return !isSlotBlocked(startMinutes, startMinutes + durationMinutes, blockedRules);
    });
}

async function listBookingsForDate(date: string) {
  const snapshot = await db.collection("Bookings").where("date", "==", date).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    bookingId: doc.id,
    ...(doc.data() as Record<string, unknown>),
  })) as BookingLike[];
}

async function computeAvailabilityForDate(
  tour: Tour,
  date: string,
  options?: { excludeBookingId?: string },
) {
  const tours = (await toursRepository.list()) as unknown as Tour[];
  const reason = getDateAvailabilityReason(date, tour, tours);
  if (reason) {
    return {
      tourId: tour.tourId,
      date,
      available: false,
      reason,
      times: [] as TimeSlotOption[],
    };
  }

  const baseSlots = getBaseTimeSlotsForDate(date, tour, tours);
  const bookings = await listBookingsForDate(date);
  const toursById = new Map(tours.map((entry) => [entry.tourId, entry]));
  const durationMinutes = getTourDurationMinutes(tour);
  const minimumStart = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const times = baseSlots.flatMap((time) => {
    const parsed = parseTime12Hour(time);
    const slotStart = parsed ? toMinutes(parsed) : -1;
    if (slotStart < 0) return [];
    const slotEnd = slotStart + durationMinutes;

    const slotDateTime = new Date(`${date}T00:00:00`);
    const [hour, minute] = parsed.split(":").map(Number);
    slotDateTime.setHours(hour, minute, 0, 0);
    if (slotDateTime < minimumStart) return [];

    let sameTourCount = 0;
    let blockedByOtherTour = false;

    for (const booking of bookings) {
      if (options?.excludeBookingId && getBookingId(booking) === options.excludeBookingId) {
        continue;
      }

      const existingStart = getBookingStartMinutes(booking);
      if (existingStart < 0) continue;

      const existingTour =
        typeof booking.tourId === "string"
          ? toursById.get(booking.tourId)
          : undefined;
      const existingEnd = getBookingEndMinutes(booking, existingTour);
      if (existingEnd <= existingStart) continue;
      if (!bookingsOverlap(slotStart, slotEnd, existingStart, existingEnd)) continue;

      if (booking.tourId === tour.tourId) {
        sameTourCount += 1;
        continue;
      }

      if (!canToursOverlap(tour, existingTour)) {
        blockedByOtherTour = true;
        break;
      }
    }

    if (blockedByOtherTour) return [];

    const remainingSpots = Math.max((tour.maxBookings || 1) - sameTourCount, 0);
    if (remainingSpots <= 0) return [];

    return [{ time, remainingSpots }];
  });

  return {
    tourId: tour.tourId,
    date,
    available: times.length > 0,
    reason: times.length > 0 ? undefined : "No available time slots for this date.",
    times,
  };
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getRequestedTourId(input: Record<string, unknown>) {
  return typeof input.tourId === "string" ? input.tourId : "";
}

function getRequestedDate(input: Record<string, unknown>, key: "date" | "rangeStart" | "rangeEnd") {
  return typeof input[key] === "string" ? input[key] : undefined;
}

export const availabilityService = {
  async getAvailability(query: unknown) {
    const input = (query ?? {}) as Record<string, unknown>;
    const tourId = getRequestedTourId(input);
    if (!tourId) {
      throw new AppError("Missing tourId.", 400);
    }

    const tour = await toursRepository.getById(tourId) as Tour;
    const date = getRequestedDate(input, "date");
    const rangeStart = getRequestedDate(input, "rangeStart");
    const rangeEnd = getRequestedDate(input, "rangeEnd");

    if (date) {
      return computeAvailabilityForDate(tour, date);
    }

    if (rangeStart && rangeEnd) {
      const dates: Record<string, boolean> = {};
      for (
        let current = new Date(`${rangeStart}T00:00:00`);
        current <= new Date(`${rangeEnd}T00:00:00`);
        current = addDays(current, 1)
      ) {
        const currentDate = formatDateString(current);
        const availability = await computeAvailabilityForDate(tour, currentDate);
        dates[currentDate] = availability.available;
      }

      return {
        tourId,
        available: Object.values(dates).some(Boolean),
        times: [],
        dates,
      };
    }

    return {
      tourId,
      available: false,
      reason: "Availability is not configured yet.",
      times: [],
    };
  },

  async assertBookingAllowed(payload: unknown, tour: unknown) {
    const booking = (payload ?? {}) as Record<string, unknown>;
    const selectedTour = tour as Tour;
    const date = typeof booking.date === "string" ? booking.date : "";
    const startTime =
      typeof booking.startTime === "string"
        ? booking.startTime
        : typeof booking.time === "string"
          ? booking.time
          : "";

    if (!date || !startTime) {
      throw new AppError("Booking must include a date and time.", 400);
    }

    const availability = await computeAvailabilityForDate(selectedTour, date);
    const matched = availability.times.some((slot) => slot.time === startTime);
    if (!matched) {
      throw new AppError(availability.reason || "That time is unavailable. Please choose a different slot.", 409);
    }
  },

  async assertRescheduleAllowed(existing: unknown, payload: unknown, tour: unknown) {
    const current = (existing ?? {}) as BookingLike;
    const updates = (payload ?? {}) as Record<string, unknown>;
    const selectedTour = tour as Tour;
    const date =
      typeof updates.date === "string"
        ? updates.date
        : typeof current.date === "string"
          ? current.date
          : "";
    const startTime =
      typeof updates.startTime === "string"
        ? updates.startTime
        : typeof updates.time === "string"
          ? updates.time
          : typeof current.startTime === "string"
            ? current.startTime
            : typeof current.time === "string"
              ? current.time
              : "";

    if (!date || !startTime) {
      throw new AppError("Booking must include a date and time.", 400);
    }

    const availability = await computeAvailabilityForDate(selectedTour, date, {
      excludeBookingId: getBookingId(current),
    });
    const matched = availability.times.some((slot) => slot.time === startTime);
    if (!matched) {
      throw new AppError(availability.reason || "That time is unavailable. Please choose a different slot.", 409);
    }
  },
};
