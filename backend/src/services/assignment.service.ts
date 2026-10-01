import { toursRepository } from "../repositories/tours.repository.js";
import { besasRepository } from "../repositories/besas.repository.js";
import {
  getEffectiveDayHours,
  isBlockedByUnavailability,
  normalizeTempAdjustments,
  normalizeTempUnavailability,
} from "../utils/besaTempSchedule.js";

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

function toMinutes(time24: string) {
  const [hours, minutes] = time24.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function isBesaAvailable(
  besa: Record<string, unknown>,
  bookingDate: string,
  bookingTime: string,
  bookingEndTime?: string,
) {
  if (!bookingDate || !bookingTime) {
    return false;
  }

  // That date's tempAdjustment hours if any, otherwise the weekly office hours
  const dayHours = getEffectiveDayHours(
    {
      officeHours: normalizeOfficeHours(besa.officeHours) as Record<string, DayHours>,
      tempAdjustments: normalizeTempAdjustments(besa.tempAdjustments),
    },
    bookingDate,
  );

  if (!dayHours.available || dayHours.timeSlots.length === 0) {
    return false;
  }

  const bookingTime24 = parseTime12Hour(bookingTime);
  if (!bookingTime24) {
    return false;
  }

  const bookingEnd24 = parseTime12Hour(bookingEndTime);
  const startMinutes = toMinutes(bookingTime24);
  const endMinutes = bookingEnd24 ? toMinutes(bookingEnd24) : startMinutes;
  // `adjustments` was the field name before tempUnavailability existed
  const unavailability = normalizeTempUnavailability(besa.tempUnavailability ?? besa.adjustments);
  if (isBlockedByUnavailability(unavailability, bookingDate, startMinutes, endMinutes)) {
    return false;
  }

  return dayHours.timeSlots.some((slot) => bookingTime24 >= slot.start && bookingTime24 <= slot.end);
}

export const assignmentService = {
  async assignBesas(payload: unknown, tour: unknown) {
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

    const tourRecord = tour && typeof tour === "object"
      ? tour as Record<string, unknown>
      : tourId ? await toursRepository.getById(tourId) : undefined;
    if (tourRecord?.disableAutoAssignBesas === true) {
      return [];
    }

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

        return isBesaAvailable(
          besa,
          bookingDate,
          bookingTime,
          typeof booking.endTime === "string" ? booking.endTime : undefined,
        );
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

    return availableBesas.map((besa) => {
      const record = besa as Record<string, unknown>;
      return {
        name: typeof record.name === "string" ? record.name.trim() : "",
        email: typeof record.email === "string" ? record.email.trim() : "",
      };
    });
  },
};
