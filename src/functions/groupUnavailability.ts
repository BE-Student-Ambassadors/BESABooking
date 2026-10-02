import { sortByDate } from "./besaTempSchedule.ts";

// Groups repeated tempUnavailability entries that share a name (reason), e.g. a weekly class
// that the Google Calendar sync writes as one entry per date, so they can be shown as one item.
// Entries without a reason are never grouped.

export type UnavailabilityGroup = {
  key: string;
  reason?: string;
  entries: TempUnavailability[]; // sorted by date
  firstDate: string;
  lastDate: string;
  weekdays: string[]; // short names, Monday first, e.g. ["Mon", "Wed"]
  windows: TempUnavailability[]; // one entry per distinct time window
  fromCalendar: boolean; // every entry came from the Google Calendar sync
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const weekdayOf = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[(new Date(y, m - 1, d, 12).getDay() + 6) % 7];
};

const windowKey = (entry: TempUnavailability) => (entry.allDay ? "allDay" : `${entry.start}-${entry.end}`);

export const groupUnavailabilityByName = (entries: TempUnavailability[] = []): UnavailabilityGroup[] => {
  const groups = new Map<string, TempUnavailability[]>();
  sortByDate(entries).forEach((entry) => {
    const name = entry.reason?.trim().toLowerCase();
    const key = name ? `name:${name}` : `single:${entry.id}`;
    groups.set(key, [...(groups.get(key) || []), entry]);
  });

  return [...groups.entries()]
    .map(([key, grouped]) => {
      const windows = new Map(grouped.map((entry) => [windowKey(entry), entry]));
      const weekdays = new Set(grouped.map((entry) => weekdayOf(entry.date)));
      return {
        key,
        reason: grouped[0].reason,
        entries: grouped,
        firstDate: grouped[0].date,
        lastDate: grouped[grouped.length - 1].date,
        weekdays: WEEKDAYS.filter((day) => weekdays.has(day)),
        windows: [...windows.values()].sort((a, b) => windowKey(a).localeCompare(windowKey(b))),
        fromCalendar: grouped.every((entry) => entry.source === "calendar"),
      };
    })
    .sort((a, b) => a.firstDate.localeCompare(b.firstDate));
};
