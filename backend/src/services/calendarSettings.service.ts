import { db } from "../config/firebaseAdmin.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

// The Google Calendars the office-hours sync (Firebase Functions) reads BESA availability
// from. Saving the list makes the functions re-watch the calendars and re-sync.
const settingsRef = () => db.collection("Settings").doc("officeHoursCalendars");

function parseIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = value.flatMap((id) => (typeof id === "string" && id.trim() ? [id.trim()] : []));
  return [...new Set(ids)];
}

function defaultIds() {
  return parseIds(env.OFFICE_HOURS_CALENDAR_IDS.split(","));
}

export const calendarSettingsService = {
  async getOfficeHoursCalendars() {
    const snapshot = await settingsRef().get();
    const data = snapshot.data();
    return {
      calendarIds: snapshot.exists ? parseIds(data?.calendarIds) : defaultIds(),
      updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : null,
    };
  },

  async updateOfficeHoursCalendars(payload: unknown) {
    const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (!Array.isArray(source.calendarIds)) {
      throw new AppError("calendarIds must be a list of Google Calendar IDs.", 400);
    }
    const calendarIds = parseIds(source.calendarIds);
    if (calendarIds.length === 0) {
      throw new AppError("Keep at least one calendar connected.", 400);
    }
    const invalid = calendarIds.find((id) => id !== "primary" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id));
    if (invalid) {
      throw new AppError(`"${invalid}" doesn't look like a Google Calendar ID.`, 400);
    }

    const updatedAt = new Date().toISOString();
    await settingsRef().set({ calendarIds, updatedAt });
    return { calendarIds, updatedAt };
  },
};
