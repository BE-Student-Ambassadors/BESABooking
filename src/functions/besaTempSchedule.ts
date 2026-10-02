// Helpers for temporary, date-specific changes to a BESA's schedule. Two kinds are stored
// on the Besas doc alongside the recurring weekly officeHours:
//   - tempAdjustments:    replacement office hours for one date (e.g. working 1-5 instead of 9-12)
//   - tempUnavailability: time the BESA is out on one date, all day or a window (e.g. dentist)
// For a given date, a tempAdjustment replaces that weekday's office hours, and
// tempUnavailability is then subtracted on top of whichever hours apply.

const HHMM = /^\d{2}:\d{2}$/;

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const hhmmToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Today's date as YYYY-MM-DD in local time (avoids the UTC shift from toISOString).
export const getLocalDateString = (date: Date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const generateTempId = () => Math.random().toString(36).slice(2, 11);

// "2026-10-05" -> "monday"
export const getDayKeyForDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return DAY_KEYS[new Date(y, (m ?? 1) - 1, d ?? 1, 12).getDay()];
};

const readEntries = (raw: unknown) =>
  (Array.isArray(raw) ? raw : []).flatMap((value: unknown) => {
    if (!value || typeof value !== "object") return [];
    const entry = value as Record<string, unknown>;
    return typeof entry.date === "string" ? [entry] : [];
  });

const readCommonFields = (entry: Record<string, unknown>) => ({
  id: typeof entry.id === "string" ? entry.id : generateTempId(),
  date: entry.date as string,
  createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "",
  ...(typeof entry.reason === "string" && entry.reason.trim() ? { reason: entry.reason.trim() } : {}),
  // Set by the Google Calendar sync (Firebase Functions); kept so admin saves don't strip it.
  ...(entry.source === "calendar" ? { source: "calendar" as const } : {}),
  ...(typeof entry.calendarEventId === "string" ? { calendarEventId: entry.calendarEventId } : {}),
});

// Coerce whatever is stored in Firestore into clean entries; malformed ones are dropped.
export const normalizeTempUnavailability = (raw: unknown): TempUnavailability[] =>
  readEntries(raw).map((entry) => {
    const start = typeof entry.start === "string" ? entry.start : "";
    const end = typeof entry.end === "string" ? entry.end : "";
    const allDay = !!entry.allDay || !HHMM.test(start) || !HHMM.test(end);
    return { ...readCommonFields(entry), allDay, ...(allDay ? {} : { start, end }) };
  });

export const normalizeTempAdjustments = (raw: unknown): TempAdjustment[] =>
  readEntries(raw).flatMap((entry) => {
    const timeSlots = (Array.isArray(entry.timeSlots) ? entry.timeSlots : []).flatMap((slot: unknown) => {
      const s = (slot || {}) as Record<string, unknown>;
      if (typeof s.start !== "string" || typeof s.end !== "string" || !HHMM.test(s.start) || !HHMM.test(s.end)) return [];
      return [{ id: typeof s.id === "string" ? s.id : generateTempId(), start: s.start, end: s.end }];
    });
    if (timeSlots.length === 0) return [];
    return [{ ...readCommonFields(entry), timeSlots: timeSlots.sort((a, b) => a.start.localeCompare(b.start)) }];
  });

const sortKey = (entry: TempUnavailability | TempAdjustment) =>
  "timeSlots" in entry ? entry.timeSlots[0]?.start ?? "" : entry.allDay ? "" : entry.start ?? "";

export const sortByDate = <T extends TempUnavailability | TempAdjustment>(entries: T[]): T[] =>
  entries.slice().sort((a, b) => a.date.localeCompare(b.date) || sortKey(a).localeCompare(sortKey(b)));

// Upcoming = today or later; past entries are only shown in the log (most recent first).
export const splitByDate = <T extends TempUnavailability | TempAdjustment>(entries: T[] = [], today = getLocalDateString()) => {
  const sorted = sortByDate(entries);
  return {
    upcoming: sorted.filter((entry) => entry.date >= today),
    past: sorted.filter((entry) => entry.date < today).reverse(),
  };
};

export const getEntriesForDate = <T extends TempUnavailability | TempAdjustment>(entries: T[] = [], date: string) =>
  sortByDate(entries.filter((entry) => entry.date === date));

// True when two lists cover the same time ranges (ignores ids and order).
export const sameSlots = (a: Array<{ start: string; end: string }>, b: Array<{ start: string; end: string }>) => {
  const key = (slots: Array<{ start: string; end: string }>) =>
    slots.map((slot) => `${slot.start}-${slot.end}`).sort().join(",");
  return key(a) === key(b);
};

/**
 * The office hours that apply to a BESA on a specific YYYY-MM-DD date:
 * a tempAdjustment for that date if one exists, otherwise the recurring weekday hours.
 * (tempUnavailability is not applied here; check it with isBlockedByUnavailability.)
 */
export const getEffectiveDayHours = (
  besa: { officeHours?: Record<string, DayHours>; tempAdjustments?: TempAdjustment[] },
  date: string
): DayHours & { adjusted: boolean } => {
  const adjustments = getEntriesForDate(besa.tempAdjustments, date);
  if (adjustments.length > 0) {
    return {
      available: true,
      timeSlots: adjustments.flatMap((adj) => adj.timeSlots).sort((a, b) => a.start.localeCompare(b.start)),
      adjusted: true,
    };
  }
  const weekly = besa.officeHours?.[getDayKeyForDate(date)];
  return { available: !!weekly?.available, timeSlots: weekly?.timeSlots || [], adjusted: false };
};

/**
 * True when a tempUnavailability entry makes the BESA unavailable for any part of
 * [startMinutes, endMinutes) on the given YYYY-MM-DD date.
 * If endMinutes <= startMinutes the window is treated as a single instant.
 */
export const isBlockedByUnavailability = (
  entries: TempUnavailability[] | undefined,
  date: string,
  startMinutes: number,
  endMinutes: number
) => {
  const effectiveEnd = Math.max(endMinutes, startMinutes + 1);
  return (entries || []).some((entry) => {
    if (entry.date !== date) return false;
    if (entry.allDay || !entry.start || !entry.end) return true;
    return hhmmToMinutes(entry.start) < effectiveEnd && startMinutes < hhmmToMinutes(entry.end);
  });
};
