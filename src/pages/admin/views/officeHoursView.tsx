import { useState, useEffect } from 'react';
import { Edit3, Save, Plus, Trash2, ChevronDown, ChevronRight, CalendarX, CalendarClock, History, List, CalendarDays } from 'lucide-react';
import api from '../../../api';
import {
  generateTempId,
  getDayKeyForDate,
  getEffectiveDayHours,
  getLocalDateString,
  sameSlots,
  sortByDate,
  splitByDate,
} from '../../../functions/besaTempSchedule.ts';
import { groupUnavailabilityByName, type UnavailabilityGroup } from '../../../functions/groupUnavailability.ts';
import OfficeHoursCalendar from './officeHoursCalendar.tsx';

interface TimeSlot {
  start: string;
  end: string;
  id: string;
}

interface DayHours {
  available: boolean;
  timeSlots: TimeSlot[];
}

interface Besa {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  officeHours: {
    [day: string]: DayHours;
  };
  tempAdjustments: TempAdjustment[];
  tempUnavailability: TempUnavailability[];
  officeHoursSource?: 'calendar'; // weekly hours come from Google Calendar
}

type Slot = { start: string; end: string };

type OfficeHoursData = {
  besas: Besa[];
  compiledSchedule: Record<string, { timeSlots: { start: string; end: string; besas: string[] }[] }>;
};

// Form state for a one-day change to office hours (tempAdjustments)
interface AdjustmentDraft {
  date: string;
  timeSlots: TimeSlot[];
  reason: string;
}

// Form state for time a BESA is out (tempUnavailability)
interface UnavailabilityDraft {
  date: string;
  allDay: boolean;
  start: string;
  end: string;
  reason: string;
}

const emptyUnavailabilityDraft = (): UnavailabilityDraft => ({
  date: getLocalDateString(),
  allDay: false,
  start: '09:00',
  end: '10:00',
  reason: '',
});

export default function OfficeHoursView() {
  const [besas, setBesas] = useState<Besa[]>([]);
  const [compiledSchedule, setCompiledSchedule] = useState<Record<string, { timeSlots: { start: string; end: string; besas: string[] }[] }>>({});
  const [editingOfficeHours, setEditingOfficeHours] = useState<string | null>(null);
  const [expandedBesas, setExpandedBesas] = useState<Set<string>>(new Set());
  const [adjustmentDrafts, setAdjustmentDrafts] = useState<Record<string, AdjustmentDraft>>({});
  const [unavailabilityDrafts, setUnavailabilityDrafts] = useState<Record<string, UnavailabilityDraft>>({});
  // Keyed by `${besaId}:adjustment` or `${besaId}:unavailability`
  const [tempErrors, setTempErrors] = useState<Record<string, string>>({});
  const [showTempLog, setShowTempLog] = useState<Set<string>>(new Set());
  const [savingTempFor, setSavingTempFor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const orderedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  const loadOfficeHoursData = async (): Promise<Besa[] | null> => {
    try {
      const response = await api.get<OfficeHoursData>('/api/admin/office-hours');
      setBesas(response.data.besas);
      setCompiledSchedule(response.data.compiledSchedule);
      return response.data.besas;
    } catch (error) {
      console.error('Error fetching office hours data:', error);
      return null;
    }
  };

  useEffect(() => {
    void loadOfficeHoursData();
  }, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  {/* Convert 24hr to 12hr format */}
  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

   {/* Convert 12hr to 24hr format */}
  const formatTime24Hour = (time12: string) => {
    if (!time12) return '';
    const [time, ampm] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours, 10);
    
    if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  };

  const toggleBesaExpansion = (besaId: string) => {
    setExpandedBesas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(besaId)) {
        newSet.delete(besaId);
      } else {
        newSet.add(besaId);
      }
      return newSet;
    });
  };

  const addTimeSlot = (besaId: string, day: string) => {
    setBesas(prev => prev.map(besa =>
      besa.id === besaId
        ? {
          ...besa,
          officeHours: {
            ...besa.officeHours,
            [day]: {
              ...besa.officeHours[day],
              timeSlots: [
                ...besa.officeHours[day].timeSlots,
                { id: generateId(), start: '09:00', end: '10:00' }
              ]
            }
          }
        }
        : besa
    ));
  };

  const removeTimeSlot = (besaId: string, day: string, slotId: string) => {
    setBesas(prev => prev.map(besa =>
      besa.id === besaId
        ? {
          ...besa,
          officeHours: {
            ...besa.officeHours,
            [day]: {
              ...besa.officeHours[day],
              timeSlots: besa.officeHours[day].timeSlots.filter(slot => slot.id !== slotId)
            }
          }
        }
        : besa
    ));
  };

  const updateTimeSlot = (besaId: string, day: string, slotId: string, field: 'start' | 'end', value: string) => {
    setBesas(prev => prev.map(besa =>
      besa.id === besaId
        ? {
          ...besa,
          officeHours: {
            ...besa.officeHours,
            [day]: {
              ...besa.officeHours[day],
              timeSlots: besa.officeHours[day].timeSlots.map(slot =>
                slot.id === slotId ? { ...slot, [field]: value } : slot
              )
            }
          }
        }
        : besa
    ));
  };

  const updateBesaAvailability = (besaId: string, day: string, available: boolean) => {
    setBesas(prev => prev.map(besa =>
      besa.id === besaId
        ? {
          ...besa,
          officeHours: {
            ...besa.officeHours,
            [day]: {
              ...besa.officeHours[day],
              available,
              timeSlots: available ? (besa.officeHours[day]?.timeSlots || [{ id: generateId(), start: '09:00', end: '17:00' }]) : []
            }
          }
        }
        : besa
    ));
  };

  const saveOfficeHoursChanges = async (besa: Besa): Promise<boolean> => {
    try {
      const response = await api.patch(`/api/besas/${besa.id}/office-hours`, {
        officeHours: besa.officeHours,
      });
      const updatedBesa = response.data as Besa;
      // The response is the raw Firestore doc; keep the normalized temp-change arrays from local state.
      setBesas((prev) => prev.map((entry) => (
        entry.id === besa.id
          ? { ...updatedBesa, tempAdjustments: entry.tempAdjustments, tempUnavailability: entry.tempUnavailability }
          : entry
      )));
      const refreshed = await api.get<{
        besas: Besa[];
        compiledSchedule: Record<string, { timeSlots: { start: string; end: string; besas: string[] }[] }>;
      }>('/api/admin/office-hours');
      setCompiledSchedule(refreshed.data.compiledSchedule);
      return true;
    } catch (error) {
      console.error('Failed to save office hours:', error);
      alert('Failed to save changes. Please try again.');
      return false;
    }
  };

  // ---------- Temporary schedule changes ----------
  // tempAdjustments: one-day replacement office hours. tempUnavailability: time the BESA is out.
  // Both save immediately, independent of the weekly office-hours Edit/Save flow.
  const today = getLocalDateString();

  // Start a one-day adjustment from the BESA's usual hours for that weekday
  const getUsualSlotsForDate = (besa: Besa, date: string): TimeSlot[] => {
    const weekly = besa.officeHours[getDayKeyForDate(date)];
    const slots = weekly?.available && weekly.timeSlots.length > 0
      ? weekly.timeSlots
      : [{ id: '', start: '09:00', end: '17:00' }];
    return slots.map(slot => ({ id: generateTempId(), start: slot.start, end: slot.end }));
  };

  const getAdjustmentDraft = (besa: Besa): AdjustmentDraft =>
    adjustmentDrafts[besa.id] || { date: today, timeSlots: getUsualSlotsForDate(besa, today), reason: '' };

  const setAdjustmentDraft = (besa: Besa, updates: Partial<AdjustmentDraft>) => {
    setAdjustmentDrafts(prev => ({ ...prev, [besa.id]: { ...getAdjustmentDraft(besa), ...updates } }));
    setTempErrors(prev => ({ ...prev, [`${besa.id}:adjustment`]: '' }));
  };

  const updateAdjustmentDraftSlot = (besa: Besa, slotId: string, field: 'start' | 'end', value: string) => {
    const draft = getAdjustmentDraft(besa);
    setAdjustmentDraft(besa, {
      timeSlots: draft.timeSlots.map(slot => (slot.id === slotId ? { ...slot, [field]: value } : slot)),
    });
  };

  const getUnavailabilityDraft = (besaId: string) => unavailabilityDrafts[besaId] || emptyUnavailabilityDraft();

  const setUnavailabilityDraft = (besaId: string, updates: Partial<UnavailabilityDraft>) => {
    setUnavailabilityDrafts(prev => ({ ...prev, [besaId]: { ...getUnavailabilityDraft(besaId), ...updates } }));
    setTempErrors(prev => ({ ...prev, [`${besaId}:unavailability`]: '' }));
  };

  // Why a save failed, in words an admin can act on
  const describeSaveError = (err: unknown) => {
    const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
    if (!response || (response.status === 500 && !response.data?.message)) {
      return "Couldn't reach the server. If you're running the site locally, make sure the backend is running (cd backend && npm run dev).";
    }
    return response.data?.message || `The server returned an error (${response.status}). Please try again.`;
  };

  const persistTempField = async (
    besaId: string,
    updates: Partial<Pick<Besa, 'tempAdjustments' | 'tempUnavailability'>>
  ) => {
    setSavingTempFor(besaId);
    try {
      await api.patch(`/api/besas/${besaId}/temp-schedule`, updates);
      setBesas(prev => prev.map(besa => (besa.id === besaId ? { ...besa, ...updates } : besa)));
      return true;
    } catch (err) {
      console.error('Failed to save temporary schedule change:', err);
      alert(`Failed to save. ${describeSaveError(err)}`);
      return false;
    } finally {
      setSavingTempFor(null);
    }
  };

  const addTempAdjustment = async (besa: Besa) => {
    const draft = getAdjustmentDraft(besa);
    const errorKey = `${besa.id}:adjustment`;
    let error = '';
    if (!draft.date) error = 'Pick a date.';
    else if (draft.date < today) error = 'Adjusted hours must be for today or a future date.';
    else if (draft.timeSlots.length === 0) error = 'Add at least one time slot. To take the whole day off, use Unavailability.';
    else if (draft.timeSlots.some(slot => !slot.start || !slot.end || slot.start >= slot.end)) error = 'Each end time must be after its start time.';
    else if (besa.tempAdjustments.some(adj => adj.date === draft.date)) error = 'This BESA already has adjusted hours on that date. Remove them first.';
    if (error) {
      setTempErrors(prev => ({ ...prev, [errorKey]: error }));
      return;
    }

    // Firestore rejects undefined values, so only include reason when set.
    const adjustment: TempAdjustment = {
      id: generateTempId(),
      date: draft.date,
      timeSlots: draft.timeSlots.slice().sort((a, b) => a.start.localeCompare(b.start)),
      createdAt: new Date().toISOString(),
      ...(draft.reason.trim() ? { reason: draft.reason.trim() } : {}),
    };
    const saved = await persistTempField(besa.id, { tempAdjustments: sortByDate([...besa.tempAdjustments, adjustment]) });
    if (saved) setAdjustmentDrafts(prev => { const next = { ...prev }; delete next[besa.id]; return next; });
  };

  const addTempUnavailability = async (besa: Besa) => {
    const draft = getUnavailabilityDraft(besa.id);
    const errorKey = `${besa.id}:unavailability`;
    let error = '';
    if (!draft.date) error = 'Pick a date.';
    else if (draft.date < today) error = 'Unavailability must be for today or a future date.';
    else if (!draft.allDay && (!draft.start || !draft.end)) error = 'Pick a start and end time, or mark the whole day.';
    else if (!draft.allDay && draft.start >= draft.end) error = 'End time must be after start time.';
    if (error) {
      setTempErrors(prev => ({ ...prev, [errorKey]: error }));
      return;
    }

    // Firestore rejects undefined values, so only include the optional fields that are set.
    const entry: TempUnavailability = {
      id: generateTempId(),
      date: draft.date,
      allDay: draft.allDay,
      createdAt: new Date().toISOString(),
      ...(draft.allDay ? {} : { start: draft.start, end: draft.end }),
      ...(draft.reason.trim() ? { reason: draft.reason.trim() } : {}),
    };
    const saved = await persistTempField(besa.id, { tempUnavailability: sortByDate([...besa.tempUnavailability, entry]) });
    if (saved) setUnavailabilityDrafts(prev => ({ ...prev, [besa.id]: { ...emptyUnavailabilityDraft(), date: draft.date } }));
  };

  const removeTempAdjustment = async (besa: Besa, id: string) => {
    if (!confirm('Remove these adjusted hours? The BESA goes back to their usual hours for that day.')) return;
    await persistTempField(besa.id, { tempAdjustments: besa.tempAdjustments.filter(adj => adj.id !== id) });
  };

  const removeTempUnavailabilityGroup = async (besa: Besa, group: UnavailabilityGroup) => {
    const count = group.entries.length;
    const message = count === 1
      ? 'Remove this unavailability?'
      : `Remove all ${count} "${group.reason}" dates?`;
    const calendarNote = group.fromCalendar
      ? '\n\nThese came from Google Calendar, so the next calendar sync will add them back unless they are removed there too.'
      : '';
    if (!confirm(message + calendarNote)) return;
    const ids = new Set(group.entries.map(entry => entry.id));
    await persistTempField(besa.id, { tempUnavailability: besa.tempUnavailability.filter(entry => !ids.has(entry.id)) });
  };

  const toggleTempLog = (besaId: string) => {
    setShowTempLog(prev => {
      const next = new Set(prev);
      if (next.has(besaId)) next.delete(besaId);
      else next.add(besaId);
      return next;
    });
  };

  const formatTempDate = (date: string) => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatSlots = (slots: TimeSlot[]) =>
    slots.map(slot => `${formatTime12Hour(slot.start)} - ${formatTime12Hour(slot.end)}`).join(', ');

  const formatUnavailabilityWindow = (entry: TempUnavailability) =>
    entry.allDay ? 'All day' : `${formatTime12Hour(entry.start || '')} - ${formatTime12Hour(entry.end || '')}`;

  const formatShortDate = (date: string) => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // "Mon, Wed · 1:00 PM - 2:30 PM" for a group of repeated unavailability
  const describeGroupWindow = (group: UnavailabilityGroup) => {
    const window = group.windows.length === 1 ? formatUnavailabilityWindow(group.windows[0]) : 'Various times';
    return group.entries.length > 1 ? `${group.weekdays.join(', ')} · ${window}` : window;
  };

  const describeGroupDates = (group: UnavailabilityGroup) =>
    group.entries.length === 1
      ? formatTempDate(group.firstDate)
      : `${formatShortDate(group.firstDate)} – ${formatTempDate(group.lastDate)} · ${group.entries.length} dates`;

  // Single list of both kinds, for the log and the all-BESA overview. Repeated unavailability
  // with the same name is one row. `date` is for sorting (first date upcoming, last date past).
  type TempChangeRow = { key: string; date: string; dateLabel: string; kind: 'adjustment' | 'unavailability'; label: string; reason?: string; besaName: string };
  const toTempRows = (
    besa: Besa,
    adjustments: TempAdjustment[],
    unavailability: TempUnavailability[],
    sortBy: 'first' | 'last' = 'first'
  ): TempChangeRow[] => [
    ...adjustments.map(adj => ({
      key: `${besa.id}-a-${adj.id}`, date: adj.date, dateLabel: formatTempDate(adj.date), kind: 'adjustment' as const,
      label: adj.timeSlots.length ? `Hours: ${formatSlots(adj.timeSlots)}` : 'No office hours', reason: adj.reason, besaName: besa.name,
    })),
    ...groupUnavailabilityByName(unavailability).map(group => ({
      key: `${besa.id}-u-${group.key}`,
      date: sortBy === 'first' ? group.firstDate : group.lastDate,
      dateLabel: describeGroupDates(group),
      kind: 'unavailability' as const,
      label: `Out: ${describeGroupWindow(group)}`, reason: group.reason, besaName: besa.name,
    })),
  ];

  // Repeated unavailability with the same name counts once
  const getUpcomingCount = (besa: Besa) =>
    splitByDate(besa.tempAdjustments, today).upcoming.length +
    groupUnavailabilityByName(splitByDate(besa.tempUnavailability, today).upcoming).length;

  const upcomingTempChangesAll = besas
    .flatMap(besa => toTempRows(
      besa,
      splitByDate(besa.tempAdjustments, today).upcoming,
      splitByDate(besa.tempUnavailability, today).upcoming
    ))
    .sort((a, b) => a.date.localeCompare(b.date) || a.besaName.localeCompare(b.besaName));

  const sameSlot = (a: Slot, b: Slot) => a.start === b.start && a.end === b.end;
  const sortSlots = <S extends Slot>(slots: S[]) => slots.slice().sort((a, b) => a.start.localeCompare(b.start));

  // Saves one date's hours from the calendar view as that date's site-made tempAdjustment.
  // `timeSlots` is the day's full hours; `temporarySlots` says which of them are temporary
  // (the rest stay the BESA's usual events on Google Calendar). Reuses the existing adjustment
  // (same id, so its Google Calendar changes are updated, not redone). With `revertIfUsual`,
  // hours that match the usual weekly ones remove the adjustment, restoring that day.
  const saveDayAdjustment = async (
    besa: Besa,
    date: string,
    timeSlots: Slot[],
    temporarySlots: Slot[],
    revertIfUsual = false
  ) => {
    const existing = besa.tempAdjustments.find(adj => adj.date === date && adj.source !== 'calendar');
    const others = besa.tempAdjustments.filter(adj => adj !== existing);
    const usual = besa.officeHours[getDayKeyForDate(date)];
    const usualSlots = usual?.available ? usual.timeSlots : [];
    const sorted = sortSlots(timeSlots);
    const temporary = sortSlots(temporarySlots.filter(slot => sorted.some(entry => sameSlot(entry, slot))));
    const next = revertIfUsual && sameSlots(usualSlots, sorted)
      ? others
      : [
        ...others,
        {
          ...(existing || {
            id: generateTempId(),
            date,
            reason: 'Changed on the office hours calendar',
            createdAt: new Date().toISOString(),
          }),
          timeSlots: sorted.map((slot, index) => ({ id: String(index), start: slot.start, end: slot.end })),
          temporarySlots: temporary.map(({ start, end }) => ({ start, end })),
        },
      ];
    return persistTempField(besa.id, { tempAdjustments: sortByDate(next) });
  };

  type WeeklyChange =
    | { action: 'change'; date: string; from: Slot; to: Slot }
    | { action: 'remove'; date: string; from: Slot }
    | { action: 'add'; date: string; to: Slot }
    | { action: 'removeAll'; date: string };

  // Permanent change to one weekly slot on that weekday, from `date` on. When the BESA's weekly
  // hours come from Google Calendar, the Firebase Function edits their "{Name}'s Availability"
  // recurring events and re-syncs; the site waits for it to finish. Otherwise only the site's
  // weekly hours change (and, having no dates, apply to every week). Resolves to the BESA as
  // it is afterwards, or null if it failed.
  const saveWeeklyChange = async (besa: Besa, change: WeeklyChange): Promise<Besa | null> => {
    if (besa.officeHoursSource !== 'calendar') {
      const day = getDayKeyForDate(change.date);
      const dayHours = besa.officeHours[day] || { available: false, timeSlots: [] };
      const timeSlots = change.action === 'add'
        ? [...dayHours.timeSlots, { id: generateTempId(), ...change.to }]
        : change.action === 'remove'
          ? dayHours.timeSlots.filter(slot => !sameSlot(slot, change.from))
          : change.action === 'change'
            ? dayHours.timeSlots.map(slot => (sameSlot(slot, change.from) ? { ...slot, ...change.to } : slot))
            : [];
      const officeHours = change.action === 'removeAll'
        ? Object.fromEntries(orderedDays.map(entry => [entry, { available: false, timeSlots: [] }]))
        : {
          ...besa.officeHours,
          [day]: { available: timeSlots.length > 0, timeSlots: sortSlots(timeSlots) },
        };
      // Merge into the latest state; `besa` may be from before an earlier save in the same action
      setBesas(prev => prev.map(entry => (entry.id === besa.id ? { ...entry, officeHours } : entry)));
      const saved = await saveOfficeHoursChanges({ ...besa, officeHours });
      return saved ? { ...besa, officeHours } : null;
    }

    try {
      const { data: request } = await api.post<{ id: string }>(
        `/api/besas/${besa.id}/office-hours/permanent-change`,
        change
      );
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        const { data: status } = await api.get<{ status: string; error?: string }>(
          `/api/besas/office-hours-requests/${request.id}`
        );
        if (status.status === 'done') {
          const fresh = await loadOfficeHoursData();
          return fresh?.find(entry => entry.id === besa.id) || besa;
        }
        if (status.status === 'failed') {
          alert(`Couldn't change ${besa.name}'s hours on Google Calendar:\n\n${status.error || 'Unknown error'}`);
          return null;
        }
      }
      alert('Google Calendar is still updating. Refresh the page in a minute to see the new hours.');
      return besa;
    } catch (error) {
      console.error('Failed to request permanent office-hours change:', error);
      alert('Failed to save. Please try again.');
      return null;
    }
  };

  // Right-click "Change to permanent hours": `slot` on that date becomes weekly from then on.
  // If that day replaced some of the usual hours, the first one is changed to `slot` (and any
  // others removed); otherwise `slot` is added. That date's one-day change then shrinks to
  // what's still temporary, or goes away if the day now matches the weekly hours.
  const makeSlotPermanent = async (besa: Besa, date: string, slot: Slot) => {
    const day = getDayKeyForDate(date);
    const usualSlots = besa.officeHours[day]?.available ? besa.officeHours[day].timeSlots : [];
    const hours = getEffectiveDayHours(besa, date);
    const dayShifts = hours.available ? hours.timeSlots : [];
    const replaced = usualSlots.filter(usual => !dayShifts.some(shift => sameSlot(shift, usual)));

    let updated: Besa | null = replaced.length === 0
      ? await saveWeeklyChange(besa, { action: 'add', date, to: slot })
      : await saveWeeklyChange(besa, { action: 'change', date, from: replaced[0], to: slot });
    for (const extra of replaced.slice(1)) {
      if (!updated) break;
      updated = await saveWeeklyChange(updated, { action: 'remove', date, from: extra });
    }
    if (!updated) return false;

    const adjustment = updated.tempAdjustments.find(adj => adj.date === date && adj.source !== 'calendar');
    if (!adjustment) return true;
    const temporary = (adjustment.temporarySlots ?? adjustment.timeSlots).filter(entry => !sameSlot(entry, slot));
    return saveDayAdjustment(updated, date, adjustment.timeSlots, temporary, true);
  };

  // Right-click "Remove office hours": `slot` that date only, that weekday from then on, or
  // every weekly slot from then on.
  const removeHoursFromCalendar = async (besa: Besa, date: string, slot: Slot, scope: 'day' | 'weekday' | 'all') => {
    if (scope === 'all') return (await saveWeeklyChange(besa, { action: 'removeAll', date })) !== null;

    if (scope === 'day') {
      const hours = getEffectiveDayHours(besa, date);
      const adjustment = besa.tempAdjustments.find(adj => adj.date === date && adj.source !== 'calendar');
      const temporary = adjustment ? adjustment.temporarySlots ?? adjustment.timeSlots : [];
      return saveDayAdjustment(
        besa, date,
        (hours.available ? hours.timeSlots : []).filter(entry => !sameSlot(entry, slot)),
        temporary.filter(entry => !sameSlot(entry, slot)),
        true
      );
    }

    const updated = await saveWeeklyChange(besa, { action: 'remove', date, from: slot });
    if (!updated) return false;
    // A one-day change on that date that kept the slot shouldn't keep it now
    const adjustment = updated.tempAdjustments.find(adj => adj.date === date && adj.source !== 'calendar');
    if (!adjustment || !adjustment.timeSlots.some(entry => sameSlot(entry, slot))) return true;
    return saveDayAdjustment(
      updated, date,
      adjustment.timeSlots.filter(entry => !sameSlot(entry, slot)),
      (adjustment.temporarySlots ?? adjustment.timeSlots).filter(entry => !sameSlot(entry, slot)),
      true
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Office Hours Management</h1>
          <p className="text-gray-600">Manage individual BESA office hours and view compiled schedule</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
            <List className="h-4 w-4" />
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'calendar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
            <CalendarDays className="h-4 w-4" />
            Calendar
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <OfficeHoursCalendar
          besas={besas}
          onSetDayHours={saveDayAdjustment}
          onWeeklyChange={async (besa, change) => (await saveWeeklyChange(besa, change)) !== null}
          onMakePermanent={makeSlotPermanent}
          onRemoveHours={removeHoursFromCalendar}
        />
      ) : (
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Individual BESA Office Hours */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Individual BESA Hours</h2>
          {besas.map((besa) => (
            <div key={besa.id} className="bg-white rounded-xl shadow-sm border">
              {/* Collapsible Header */}
              <div 
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-t-xl"
                onClick={() => toggleBesaExpansion(besa.id)}
              >
                <div className="flex items-center space-x-3">
                  {expandedBesas.has(besa.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{besa.name}</h3>
                      {getUpcomingCount(besa) > 0 && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {getUpcomingCount(besa)} upcoming change{getUpcomingCount(besa) === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{besa.email}</p>
                  </div>
                </div>
                {expandedBesas.has(besa.id) && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (editingOfficeHours === besa.id) {
                        await saveOfficeHoursChanges(besa);
                        setEditingOfficeHours(null);
                      } else {
                        setEditingOfficeHours(besa.id);
                      }
                    }}
                    className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium">
                    <Edit3 className="h-3 w-3" />
                    <span>{editingOfficeHours === besa.id ? 'Cancel' : 'Edit'}</span>
                  </button>
                )}
              </div>

              {/* Expandable Content */}
              {expandedBesas.has(besa.id) && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="space-y-3 mt-4">
                    {orderedDays.map((day) => {
                      const hours = besa.officeHours[day] || { available: false, timeSlots: [] };
                      return (
                        <div key={day} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{dayNames[day as keyof typeof dayNames]}</span>
                            {editingOfficeHours === besa.id && (
                              <input
                                type="checkbox"
                                checked={hours.available}
                                onChange={(e) => updateBesaAvailability(besa.id, day, e.target.checked)}
                                className="h-4 w-4 text-blue-600"
                              />
                            )}
                          </div>
                          
                          {hours.available ? (
                            <div className="space-y-2">
                              {hours.timeSlots.map((slot) => (
                                <div key={slot.id} className="flex items-center space-x-2">
                                  {editingOfficeHours === besa.id ? (
                                    <>
                                      <input
                                        type="time"
                                        value={slot.start}
                                        onChange={(e) => updateTimeSlot(besa.id, day, slot.id, 'start', e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                                      />
                                      <span className="text-xs text-gray-500">to</span>
                                      <input
                                        type="time"
                                        value={slot.end}
                                        onChange={(e) => updateTimeSlot(besa.id, day, slot.id, 'end', e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                                      />
                                      {hours.timeSlots.length > 1 && (
                                        <button
                                          onClick={() => removeTimeSlot(besa.id, day, slot.id)}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-600 flex-1">
                                      {formatTime12Hour(slot.start)} - {formatTime12Hour(slot.end)}
                                    </span>
                                  )}
                                </div>
                              ))}
                              
                              {editingOfficeHours === besa.id && hours.available && (
                                <button
                                  onClick={() => addTimeSlot(besa.id, day)}
                                  className="flex items-center space-x-1 text-blue-600 hover:bg-blue-50 rounded px-2 py-1 text-xs">
                                  <Plus className="h-3 w-3" />
                                  <span>Add Time Slot</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            !editingOfficeHours && (
                              <span className="text-sm text-gray-500">Unavailable</span>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {editingOfficeHours === besa.id && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={async () => {
                          const besaToSave = besas.find(b => b.id === editingOfficeHours);
                          if (!besaToSave) return;

                          try {
                            await saveOfficeHoursChanges(besaToSave);
                            setEditingOfficeHours(null); 
                          } catch (error) {
                            console.error('Failed to save office hours:', error);
                            alert('Failed to save changes. Please try again.');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-1">
                        <Save className="h-3 w-3" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  )}

                  {/* Temporary, date-specific changes: tempAdjustments and tempUnavailability */}
                  {(() => {
                    const adjustmentDraft = getAdjustmentDraft(besa);
                    const unavailabilityDraft = getUnavailabilityDraft(besa.id);
                    const adjustments = splitByDate(besa.tempAdjustments, today);
                    const unavailability = splitByDate(besa.tempUnavailability, today);
                    const pastRows = toTempRows(besa, adjustments.past, unavailability.past, 'last')
                      .sort((a, b) => b.date.localeCompare(a.date));
                    const isSaving = savingTempFor === besa.id;
                    const logOpen = showTempLog.has(besa.id);
                    return (
                      <div className="mt-6 pt-4 border-t border-gray-100 space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">Temporary Changes</h4>
                          <button
                            onClick={() => toggleTempLog(besa.id)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
                            <History className="h-3 w-3" />
                            <span>{logOpen ? 'Hide log' : `View log (${pastRows.length})`}</span>
                          </button>
                        </div>

                        {/* Adjusted hours (tempAdjustments) */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-800 flex items-center gap-1 mb-1">
                            <CalendarClock className="h-4 w-4 text-amber-600" />
                            Adjusted Hours
                          </h5>
                          <p className="text-xs text-gray-500 mb-2">
                            Different office hours for a single date. They replace this BESA's usual hours for that day only.
                          </p>

                          {adjustments.upcoming.length > 0 ? (
                            <div className="space-y-2 mb-3">
                              {adjustments.upcoming.map(adj => (
                                <div key={adj.id} className="flex items-start justify-between gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                  <div className="text-sm">
                                    <div className="font-medium text-gray-900">{formatTempDate(adj.date)}</div>
                                    <div className="text-amber-700">{adj.timeSlots.length ? formatSlots(adj.timeSlots) : 'No office hours this day'}</div>
                                    {adj.reason && <div className="text-xs text-gray-500 mt-0.5">{adj.reason}</div>}
                                    {adj.source === 'calendar' && <div className="text-xs text-gray-400 mt-0.5">From Google Calendar</div>}
                                  </div>
                                  <button
                                    onClick={() => removeTempAdjustment(besa, adj.id)}
                                    disabled={isSaving}
                                    aria-label="Remove adjusted hours"
                                    className="p-1 text-amber-700 hover:bg-amber-100 rounded disabled:opacity-50">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mb-2">No upcoming adjusted hours.</p>
                          )}

                          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                            <input
                              type="date"
                              min={today}
                              value={adjustmentDraft.date}
                              onChange={(e) =>
                                setAdjustmentDraft(besa, {
                                  date: e.target.value,
                                  timeSlots: e.target.value ? getUsualSlotsForDate(besa, e.target.value) : adjustmentDraft.timeSlots,
                                })
                              }
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            {adjustmentDraft.timeSlots.map(slot => (
                              <div key={slot.id} className="flex items-center space-x-2">
                                <input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) => updateAdjustmentDraftSlot(besa, slot.id, 'start', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                                />
                                <span className="text-xs text-gray-500">to</span>
                                <input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) => updateAdjustmentDraftSlot(besa, slot.id, 'end', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                                />
                                {adjustmentDraft.timeSlots.length > 1 && (
                                  <button
                                    onClick={() => setAdjustmentDraft(besa, { timeSlots: adjustmentDraft.timeSlots.filter(s => s.id !== slot.id) })}
                                    aria-label="Remove time slot"
                                    className="p-1 text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() =>
                                setAdjustmentDraft(besa, {
                                  timeSlots: [...adjustmentDraft.timeSlots, { id: generateTempId(), start: '09:00', end: '10:00' }],
                                })
                              }
                              className="flex items-center space-x-1 text-blue-600 hover:bg-blue-50 rounded px-2 py-1 text-xs">
                              <Plus className="h-3 w-3" />
                              <span>Add Time Slot</span>
                            </button>
                            <input
                              type="text"
                              placeholder="Reason (optional, e.g. covering for a midterm week)"
                              value={adjustmentDraft.reason}
                              onChange={(e) => setAdjustmentDraft(besa, { reason: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            {tempErrors[`${besa.id}:adjustment`] && (
                              <p className="text-xs text-red-600">{tempErrors[`${besa.id}:adjustment`]}</p>
                            )}
                            <div className="flex justify-end">
                              <button
                                onClick={() => addTempAdjustment(besa)}
                                disabled={isSaving}
                                className="flex items-center space-x-1 px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-xs disabled:opacity-50">
                                <Plus className="h-3 w-3" />
                                <span>{isSaving ? 'Saving...' : 'Add Adjusted Hours'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Unavailability (tempUnavailability) */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-800 flex items-center gap-1 mb-1">
                            <CalendarX className="h-4 w-4 text-red-500" />
                            Unavailability
                          </h5>
                          <p className="text-xs text-gray-500 mb-2">
                            Times this BESA is out on a date. They won't be auto-assigned to overlapping tours, and those
                            times aren't offered for booking unless another BESA covers them.
                          </p>

                          {unavailability.upcoming.length > 0 ? (
                            <div className="space-y-2 mb-3">
                              {groupUnavailabilityByName(unavailability.upcoming).map(group => (
                                <div key={group.key} className="flex items-start justify-between gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                  <div className="text-sm min-w-0">
                                    {group.entries.length > 1 && group.reason && (
                                      <div className="font-medium text-gray-900">{group.reason}</div>
                                    )}
                                    <div className={group.entries.length > 1 ? 'text-gray-700' : 'font-medium text-gray-900'}>
                                      {describeGroupDates(group)}
                                    </div>
                                    <div className="text-red-600">Unavailable · {describeGroupWindow(group)}</div>
                                    {group.entries.length === 1 && group.reason && (
                                      <div className="text-xs text-gray-500 mt-0.5">{group.reason}</div>
                                    )}
                                    {group.fromCalendar && <div className="text-xs text-gray-400 mt-0.5">From Google Calendar</div>}
                                    {group.entries.length > 1 && (
                                      <details className="mt-1">
                                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Show dates</summary>
                                        <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                                          {group.entries.map(entry => (
                                            <li key={entry.id}>
                                              {formatTempDate(entry.date)}
                                              {group.windows.length > 1 && <span className="text-gray-400"> · {formatUnavailabilityWindow(entry)}</span>}
                                            </li>
                                          ))}
                                        </ul>
                                      </details>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => removeTempUnavailabilityGroup(besa, group)}
                                    disabled={isSaving}
                                    aria-label={group.entries.length > 1 ? 'Remove all of these dates' : 'Remove unavailability'}
                                    title={group.entries.length > 1 ? `Remove all ${group.entries.length} dates` : undefined}
                                    className="p-1 text-red-500 hover:bg-red-100 rounded disabled:opacity-50">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 mb-2">No upcoming unavailability.</p>
                          )}

                          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="date"
                                min={today}
                                value={unavailabilityDraft.date}
                                onChange={(e) => setUnavailabilityDraft(besa.id, { date: e.target.value })}
                                className="px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                              <label className="flex items-center gap-1 text-xs text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={unavailabilityDraft.allDay}
                                  onChange={(e) => setUnavailabilityDraft(besa.id, { allDay: e.target.checked })}
                                  className="h-3 w-3 text-blue-600"
                                />
                                Whole day
                              </label>
                            </div>
                            {!unavailabilityDraft.allDay && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="time"
                                  value={unavailabilityDraft.start}
                                  onChange={(e) => setUnavailabilityDraft(besa.id, { start: e.target.value })}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                                />
                                <span className="text-xs text-gray-500">to</span>
                                <input
                                  type="time"
                                  value={unavailabilityDraft.end}
                                  onChange={(e) => setUnavailabilityDraft(besa.id, { end: e.target.value })}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                                />
                              </div>
                            )}
                            <input
                              type="text"
                              placeholder="Reason (optional, e.g. dentist appointment)"
                              value={unavailabilityDraft.reason}
                              onChange={(e) => setUnavailabilityDraft(besa.id, { reason: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            {tempErrors[`${besa.id}:unavailability`] && (
                              <p className="text-xs text-red-600">{tempErrors[`${besa.id}:unavailability`]}</p>
                            )}
                            <div className="flex justify-end">
                              <button
                                onClick={() => addTempUnavailability(besa)}
                                disabled={isSaving}
                                className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs disabled:opacity-50">
                                <Plus className="h-3 w-3" />
                                <span>{isSaving ? 'Saving...' : 'Add Unavailability'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Log of past temporary changes */}
                        {logOpen && (
                          <div>
                            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Past temporary changes</h5>
                            {pastRows.length > 0 ? (
                              <div className="space-y-1">
                                {pastRows.map(row => (
                                  <div key={row.key} className="text-xs text-gray-500 flex flex-wrap gap-x-2">
                                    <span className="font-medium text-gray-600">{row.dateLabel}</span>
                                    <span className={row.kind === 'adjustment' ? 'text-amber-700' : 'text-red-600'}>{row.label}</span>
                                    {row.reason && <span>· {row.reason}</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">No past temporary changes.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Compiled Schedule */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Compiled Office Hours</h2>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Availability</h3>
            <div className="space-y-4">
              {orderedDays.map((day) => {
                const daySchedule = compiledSchedule[day];
                return (
                  <div key={day} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="mb-2">
                      <span className="font-medium text-gray-900">{dayNames[day as keyof typeof dayNames]}</span>
                    </div>
                    {daySchedule && daySchedule.timeSlots.length > 0 ? (
                      <div className="space-y-2">
                        {daySchedule.timeSlots.map((slot, index) => (
                          <div key={index} className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-green-600">
                              {formatTime12Hour(slot.start)} - {formatTime12Hour(slot.end)}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <div className="flex flex-wrap gap-1">
                              {slot.besas.map((besaName, besaIndex) => (
                                <span key={besaIndex} className="text-sm text-green-600 font-medium">
                                  {besaName}
                                  {besaIndex < slot.besas.length - 1 && <span className="text-gray-400">, </span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming temporary changes across all BESAs */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Temporary Changes</h3>
            {upcomingTempChangesAll.length > 0 ? (
              <div className="space-y-2">
                {upcomingTempChangesAll.map(row => (
                  <div key={row.key} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">{row.dateLabel}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="font-medium text-gray-900">{row.besaName}</span>
                    <span className={row.kind === 'adjustment' ? 'text-amber-700' : 'text-red-600'}>{row.label}</span>
                    {row.reason && <span className="text-xs text-gray-500">({row.reason})</span>}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm text-gray-500">No upcoming temporary changes.</span>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(compiledSchedule).length}
                </div>
                <div className="text-sm text-gray-600">Days Covered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {besas.filter(b => b.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active BESAs</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
