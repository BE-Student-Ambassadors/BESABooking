import { besasRepository } from "../repositories/besas.repository.js";
import { bookingsRepository } from "../repositories/bookings.repository.js";
import { toursRepository } from "../repositories/tours.repository.js";
import { assignmentService } from "./assignment.service.js";

const dayMapping = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
} as const;

type NormalizedOfficeHours = Record<string, { available: boolean; timeSlots: Array<{ id: string; start: string; end: string }> }>;
type NormalizedTour = Record<string, unknown> & { tourId: string };
type BesaAssignment = { name: string; email: string };
type NormalizedBooking = Record<string, unknown> & {
  bookingId: string;
  date: string;
  besas: Array<BesaAssignment | string>;
};

function parseTime12Hour(time12?: string) {
  if (!time12) {
    return "";
  }

  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) {
    return "";
  }

  let hour = Number.parseInt(match[1] ?? "0", 10);
  const minute = match[2] ?? "00";
  const meridiem = (match[3] ?? "").toUpperCase();

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  } else if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function toDateTime(dateStr: string, time12?: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const base = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
  const time24 = parseTime12Hour(time12);

  if (!time24) {
    return base;
  }

  const [hours, minutes] = time24.split(":").map(Number);
  base.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return base;
}

function normalizeDateKey(dateStr: unknown) {
  if (typeof dateStr !== "string" || dateStr.trim() === "") {
    return "";
  }

  const parts = dateStr.split("-");
  if (parts.length !== 3) {
    return dateStr;
  }

  const [year, month, day] = parts;
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function createId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

function normalizeOfficeHours(officeHours: unknown): NormalizedOfficeHours {
  const normalized: NormalizedOfficeHours = {};

  if (!officeHours || typeof officeHours !== "object") {
    return normalized;
  }

  Object.entries(officeHours).forEach(([day, hours]) => {
    if (hours && typeof hours === "object" && "start" in hours && "end" in hours) {
      const range = hours as { start?: unknown; end?: unknown };
      normalized[day] = {
        available: true,
        timeSlots: [
          {
            id: createId(day, 0),
            start: typeof range.start === "string" ? range.start : "09:00",
            end: typeof range.end === "string" ? range.end : "17:00",
          },
        ],
      };
      return;
    }

    if (hours && typeof hours === "object" && "available" in hours && "timeSlots" in hours) {
      const detailed = hours as {
        available?: unknown;
        timeSlots?: Array<{ id?: unknown; start?: unknown; end?: unknown }>;
      };

      normalized[day] = {
        available: Boolean(detailed.available),
        timeSlots: Array.isArray(detailed.timeSlots)
          ? detailed.timeSlots.map((slot, index) => ({
              id: typeof slot.id === "string" ? slot.id : createId(day, index),
              start: typeof slot.start === "string" ? slot.start : "09:00",
              end: typeof slot.end === "string" ? slot.end : "17:00",
            }))
          : [],
      };
      return;
    }

    normalized[day] = {
      available: false,
      timeSlots: [],
    };
  });

  return normalized;
}

function normalizeBesa(besa: Record<string, unknown>) {
  return {
    id: typeof besa.id === "string" ? besa.id : "",
    name: typeof besa.name === "string" ? besa.name : "",
    email: typeof besa.email === "string" ? besa.email : "",
    status: typeof besa.status === "string" ? besa.status : "",
    role: typeof besa.role === "string" ? besa.role : "",
    supportedTourIds: Array.isArray(besa.supportedTourIds)
      ? besa.supportedTourIds.filter((value): value is string => typeof value === "string")
      : [],
    officeHours: normalizeOfficeHours(besa.officeHours),
  };
}

function normalizeTour(tour: Record<string, unknown>): NormalizedTour {
  return {
    ...tour,
    tourId: typeof tour.tourId === "string" ? tour.tourId : typeof tour.id === "string" ? tour.id : "",
  };
}

function normalizeBesaAssignment(value: unknown): BesaAssignment | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const besa = value as Record<string, unknown>;
  const name = typeof besa.name === "string" ? besa.name.trim() : "";
  const email = typeof besa.email === "string" ? besa.email.trim() : "";
  return name && email ? { name, email } : undefined;
}

function normalizeBooking(booking: Record<string, unknown>): NormalizedBooking {
  return {
    ...booking,
    bookingId: typeof booking.bookingId === "string" ? booking.bookingId : "",
    date: normalizeDateKey(booking.date),
    besas: Array.isArray(booking.besas)
      ? booking.besas.flatMap<BesaAssignment | string>((value) => {
        if (typeof value === "string" && value.trim()) return [value.trim()];
        const assignment = normalizeBesaAssignment(value);
        return assignment ? [assignment] : [];
      })
      : [],
  };
}

function sanitizeBookingUpdate(payload: unknown) {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const allowedFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "organization",
    "role",
    "tourId",
    "tourType",
    "date",
    "time",
    "startTime",
    "endTime",
    "attendees",
    "maxAttendees",
    "interests",
    "besas",
    "notes",
    "status",
    "modificationReason",
    "largeTourDetails",
    "accommodations",
    "timeSlot",
  ] as const;

  const sanitized = Object.fromEntries(
    allowedFields.filter((field) => field in source).map((field) => [field, source[field]]),
  ) as Record<string, unknown>;

  if (typeof sanitized.date === "string") {
    sanitized.date = normalizeDateKey(sanitized.date);
  }

  if (Array.isArray(sanitized.besas)) {
    sanitized.besas = sanitized.besas
      .map(normalizeBesaAssignment)
      .filter((assignment): assignment is BesaAssignment => Boolean(assignment));
  }

  return sanitized;
}

function getWeekBounds(baseDate = new Date()) {
  const startOfWeek = new Date(baseDate);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(baseDate.getDate() - baseDate.getDay());

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
}

function enrichBesasWithStats(
  besas: ReturnType<typeof normalizeBesa>[],
  bookings: ReturnType<typeof normalizeBooking>[],
) {
  const { startOfWeek, endOfWeek } = getWeekBounds();

  return besas.map((besa) => {
    const besaBookings = bookings.filter((booking) => booking.besas.some((assigned) =>
      typeof assigned === "string" ? assigned === besa.name : assigned.name === besa.name
    ));
    const toursThisWeek = besaBookings.filter((booking) => {
      if (!booking.date) {
        return false;
      }

      const bookingDate = toDateTime(booking.date);
      return bookingDate >= startOfWeek && bookingDate <= endOfWeek;
    }).length;

    return {
      ...besa,
      toursThisWeek,
      totalTours: besaBookings.length,
    };
  });
}

function buildCompiledSchedule(besas: ReturnType<typeof normalizeBesa>[]) {
  const orderedDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const schedule: Record<string, { timeSlots: Array<{ start: string; end: string; besas: string[] }> }> = {};

  orderedDays.forEach((day) => {
    const availableBesas = besas.filter((besa) => {
      const dayHours = besa.officeHours[day];
      return dayHours?.available && dayHours.timeSlots.length > 0;
    });

    if (availableBesas.length === 0) {
      return;
    }

    const allTimeSlots: Array<{ start: string; end: string; besas: string[] }> = [];
    availableBesas.forEach((besa) => {
      besa.officeHours[day].timeSlots.forEach((slot) => {
        const existing = allTimeSlots.find((entry) => entry.start === slot.start && entry.end === slot.end);
        if (existing) {
          existing.besas.push(besa.name);
        } else {
          allTimeSlots.push({
            start: slot.start,
            end: slot.end,
            besas: [besa.name],
          });
        }
      });
    });

    allTimeSlots.sort((left, right) => left.start.localeCompare(right.start));
    schedule[day] = { timeSlots: allTimeSlots };
  });

  return schedule;
}

async function loadAdminData() {
  const [bookings, tours, besas] = await Promise.all([
    bookingsRepository.list(),
    toursRepository.list(),
    besasRepository.list(),
  ]);

  return {
    bookings: bookings.map((booking: Record<string, unknown>) => normalizeBooking(booking)),
    tours: tours.map((tour: Record<string, unknown>) => normalizeTour(tour)),
    besas: besas.map((besa: Record<string, unknown>) => normalizeBesa(besa)),
  };
}

export const adminService = {
  async getDashboardData() {
    const { bookings, tours, besas } = await loadAdminData();
    const normalizedBookings = [...bookings].sort((left, right) => {
      const leftDate = toDateTime(left.date, typeof left.time === "string" ? left.time : typeof left.startTime === "string" ? left.startTime : undefined);
      const rightDate = toDateTime(right.date, typeof right.time === "string" ? right.time : typeof right.startTime === "string" ? right.startTime : undefined);
      return leftDate.getTime() - rightDate.getTime();
    });

    const today = new Date();
    const todayKey = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    const { startOfWeek, endOfWeek } = getWeekBounds(today);

    return {
      stats: {
        todaysTours: normalizedBookings.filter((booking) => booking.date === todayKey).length,
        weeklyTours: normalizedBookings.filter((booking) => {
          if (!booking.date) {
            return false;
          }
          const bookingDate = toDateTime(booking.date);
          return bookingDate >= startOfWeek && bookingDate <= endOfWeek;
        }).length,
      },
      bookings: normalizedBookings,
      tours,
      besas,
      metadata: {
        generatedAt: new Date().toISOString(),
        localDayKey: dayMapping[today.getDay() as keyof typeof dayMapping],
      },
    };
  },

  async getScheduleData() {
    return loadAdminData();
  },

  async getBesaManagementData() {
    const { bookings, tours, besas } = await loadAdminData();
    return {
      bookings,
      tours: tours.map((tour) => ({
        id: tour.tourId,
        title: typeof tour.title === "string" ? tour.title : "Untitled Tour",
      })),
      besas: enrichBesasWithStats(besas, bookings),
    };
  },

  async getOfficeHoursData() {
    const { besas } = await loadAdminData();
    return {
      besas,
      compiledSchedule: buildCompiledSchedule(besas),
    };
  },

  async updateDashboardBooking(bookingId: string, payload: unknown) {
    return bookingsRepository.updateAdmin(bookingId, sanitizeBookingUpdate(payload));
  },

  async getDashboardAssignments(payload: unknown) {
    const besas = await assignmentService.assignBesas(payload, null);
    return { besas };
  },

  async deleteDashboardBooking(bookingId: string) {
    await bookingsRepository.cancel(bookingId);
  },
};
