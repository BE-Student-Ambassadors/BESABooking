import { besasRepository } from "../repositories/besas.repository.js";

const dayMapping = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
} as const;

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

function rolePriority(role?: string) {
  const normalized = (role ?? "").toLowerCase();
  if (normalized === "besa") {
    return 0;
  }
  if (normalized === "besas on-call" || normalized === "besa on-call") {
    return 1;
  }
  return 2;
}

function normalizeOfficeHours(officeHours: unknown) {
  const normalized: Record<string, { available: boolean; timeSlots: Array<{ start: string; end: string }> }> = {};

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
        timeSlots?: Array<{ start?: unknown; end?: unknown }>;
      };

      normalized[day] = {
        available: Boolean(detailed.available),
        timeSlots: Array.isArray(detailed.timeSlots)
          ? detailed.timeSlots.map((slot) => ({
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

function isBesaAvailable(
  officeHours: Record<string, { available: boolean; timeSlots: Array<{ start: string; end: string }> }>,
  bookingDate: string,
  bookingTime: string,
) {
  if (!bookingDate || !bookingTime) {
    return false;
  }

  const [year, month, day] = bookingDate.split("-").map(Number);
  const localDate = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
  const dayKey = dayMapping[localDate.getDay() as keyof typeof dayMapping];
  const dayHours = officeHours[dayKey];

  if (!dayHours || !dayHours.available || dayHours.timeSlots.length === 0) {
    return false;
  }

  const bookingTime24 = parseTime12Hour(bookingTime);
  if (!bookingTime24) {
    return false;
  }

  return dayHours.timeSlots.some((slot) => bookingTime24 >= slot.start && bookingTime24 <= slot.end);
}

export const assignmentService = {
  async assignBesas(payload: unknown, _tour: unknown) {
    const booking = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const bookingDate = normalizeDateKey(booking.date);
    const bookingTime =
      typeof booking.time === "string"
        ? booking.time
        : typeof booking.startTime === "string"
          ? booking.startTime
          : "";
    const tourId =
      typeof booking.tourId === "string" && booking.tourId.trim() !== ""
        ? booking.tourId
        : undefined;

    const besas = await besasRepository.listActive();
    const availableBesas = besas
      .filter((entry) => {
        const besa = entry as Record<string, unknown>;
        const supportedTourIds = Array.isArray(besa.supportedTourIds)
          ? besa.supportedTourIds.filter((value): value is string => typeof value === "string")
          : [];

        if (tourId && supportedTourIds.length > 0 && !supportedTourIds.includes(tourId)) {
          return false;
        }

        const officeHours = normalizeOfficeHours(besa.officeHours);
        return isBesaAvailable(officeHours, bookingDate, bookingTime);
      })
      .sort((left, right) => {
        const leftBesa = left as Record<string, unknown>;
        const rightBesa = right as Record<string, unknown>;
        const priorityDiff = rolePriority(typeof leftBesa.role === "string" ? leftBesa.role : undefined)
          - rolePriority(typeof rightBesa.role === "string" ? rightBesa.role : undefined);

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        const leftName = typeof leftBesa.name === "string" ? leftBesa.name : "";
        const rightName = typeof rightBesa.name === "string" ? rightBesa.name : "";
        return leftName.localeCompare(rightName);
      })
      .slice(0, 2);

    return availableBesas
      .map((besa) => {
        const name = (besa as Record<string, unknown>).name;
        return typeof name === "string" ? name.trim() : "";
      })
      .filter(Boolean);
  },
};
