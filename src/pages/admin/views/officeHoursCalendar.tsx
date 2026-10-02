import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Repeat, Trash2 } from 'lucide-react';
import {
  getDayKeyForDate,
  getEffectiveDayHours,
  getEntriesForDate,
  getLocalDateString,
  sameSlots,
} from '../../../functions/besaTempSchedule.ts';
import { groupUnavailabilityByName } from '../../../functions/groupUnavailability.ts';

// Weekly calendar view of office hours, for one BESA or everyone ("All"). Weeks are a
// carousel: this week plus every week with an upcoming temporary change; the weeks skipped
// in between are listed as dates. Dragging a block (or its bottom edge) on today or a later
// day asks whether to make it a temporary (that day only) or permanent (weekly) change.

export type CalendarBesa = {
  id: string;
  name: string;
  email: string;
  officeHours: Record<string, DayHours>;
  tempAdjustments: TempAdjustment[];
  tempUnavailability: TempUnavailability[];
  officeHoursSource?: 'calendar';
};

type Slot = { start: string; end: string };

// A dropped drag waiting for the temporary/permanent choice
type PendingChange<T> = {
  besa: T;
  date: string;
  from: Slot;
  to: Slot;
  shifts: Slot[]; // that day's hours before the change
  temporary: Slot[]; // which of them were already temporary
  adjusted: boolean; // the day already had a one-day change
  scope: 'shift' | 'all'; // replace just the dragged shift, or every shift that day
};

export type WeeklyChange =
  | { action: 'change'; date: string; from: Slot; to: Slot }
  | { action: 'remove'; date: string; from: Slot }
  | { action: 'add'; date: string; to: Slot }
  | { action: 'removeAll'; date: string };

interface OfficeHoursCalendarProps<T extends CalendarBesa> {
  besas: T[];
  // Saves one date's hours: `timeSlots` is the full day, `temporarySlots` the temporary ones
  // (the rest stay their usual events). With `revertIfUsual`, usual hours remove the change.
  // Each resolves to false if the save failed.
  onSetDayHours: (besa: T, date: string, timeSlots: Slot[], temporarySlots: Slot[], revertIfUsual?: boolean) => Promise<boolean>;
  // Permanent change to the weekly hours from `date` on
  onWeeklyChange: (besa: T, change: WeeklyChange) => Promise<boolean>;
  // Right-click "Change to permanent hours"
  onMakePermanent: (besa: T, date: string, slot: Slot) => Promise<boolean>;
  // Right-click "Remove office hours": that date, that weekday from then on, or all of them
  onRemoveHours: (besa: T, date: string, slot: Slot, scope: 'day' | 'weekday' | 'all') => Promise<boolean>;
}

// Right-click menu, on an hour block or on an empty part of a day
type ContextMenu = {
  x: number;
  y: number;
  date: string;
  besaId: string | null; // null on empty space in the All view
  slot?: Slot; // set when opened on a block
  minutes?: number; // where empty space was clicked
};

type AddDraft = {
  besaId: string;
  date: string;
  start: string;
  end: string;
  mode: 'temporary' | 'permanent';
  replace: string; // 'all', 'none', or the key of the one shift it replaces (temporary only)
  error: string;
};

type ConfirmConvert<T> = { besa: T; date: string; slot: Slot; target: 'temporary' | 'permanent'; scope: 'shift' | 'all' };

type RemoveDraft<T> = { besa: T; date: string; slot: Slot; scope: 'day' | 'weekday' | 'all' };

type Slide = {
  weekStart: string;
  skipped?: { from: string; to: string }; // weeks with no changes before this one
};

type DragState = {
  besaId: string;
  date: string;
  index: number;
  mode: 'move' | 'resize';
  startY: number;
  origStart: number;
  origEnd: number;
  start: number;
  end: number;
  dropped?: boolean; // released; waiting on the temporary/permanent popup
};

type BlockItem = {
  besaIndex: number;
  slotIndex: number;
  slot: TimeSlot;
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

const ALL = 'all';
const HOUR_PX = 44;
const SNAP_MINUTES = 15;
const DAY_MINUTES = 24 * 60;

// One colour per BESA in the All view. Amber and red are left out: they mean
// "adjusted" and "unavailable".
const PALETTE = [
  { block: 'bg-blue-100 border-blue-400 text-blue-900', dot: 'bg-blue-400' },
  { block: 'bg-emerald-100 border-emerald-400 text-emerald-900', dot: 'bg-emerald-400' },
  { block: 'bg-violet-100 border-violet-400 text-violet-900', dot: 'bg-violet-400' },
  { block: 'bg-pink-100 border-pink-400 text-pink-900', dot: 'bg-pink-400' },
  { block: 'bg-cyan-100 border-cyan-400 text-cyan-900', dot: 'bg-cyan-400' },
  { block: 'bg-lime-100 border-lime-500 text-lime-900', dot: 'bg-lime-500' },
  { block: 'bg-indigo-100 border-indigo-400 text-indigo-900', dot: 'bg-indigo-400' },
  { block: 'bg-teal-100 border-teal-400 text-teal-900', dot: 'bg-teal-400' },
  { block: 'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900', dot: 'bg-fuchsia-400' },
  { block: 'bg-sky-100 border-sky-400 text-sky-900', dot: 'bg-sky-400' },
];

const parseDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

const addDays = (date: string, days: number) => {
  const next = parseDate(date);
  next.setDate(next.getDate() + days);
  return getLocalDateString(next);
};

// Weeks start on Monday, matching the list view
const startOfWeek = (date: string) => addDays(date, -((parseDate(date).getDay() + 6) % 7));

const weekDates = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const formatSlots = (slots: Array<{ start: string; end: string }>) =>
  slots.map(slot => `${formatTime(toMinutes(slot.start))} - ${formatTime(toMinutes(slot.end))}`).join(', ');

const formatWindow = (entry: TempUnavailability) =>
  entry.allDay || !entry.start || !entry.end
    ? 'all day'
    : `${formatTime(toMinutes(entry.start))} - ${formatTime(toMinutes(entry.end))}`;

const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  parseDate(date).toLocaleDateString('en-US', options);

const isAllDay = (entry: TempUnavailability) => entry.allDay || !entry.start || !entry.end;

const sameSlot = (a: Slot, b: Slot) => a.start === b.start && a.end === b.end;
const slotKey = (slot: Slot) => `${slot.start}-${slot.end}`;

// A BESA's hours on one date and which of them are temporary (from that date's site-made
// change). A day changed only in Google Calendar can still be edited here: the site's change
// then takes over that day. `fromCalendar` is just for labels.
function dayState(besa: CalendarBesa, date: string) {
  const hours = getEffectiveDayHours(besa, date);
  const shifts = (hours.available ? hours.timeSlots : []).map(({ start, end }) => ({ start, end }));
  const siteAdjustment = besa.tempAdjustments.find(adj => adj.date === date && adj.source !== 'calendar');
  const fromCalendar = !siteAdjustment && besa.tempAdjustments.some(adj => adj.date === date && adj.source === 'calendar');
  const temporary = siteAdjustment
    ? (siteAdjustment.temporarySlots ?? siteAdjustment.timeSlots).map(({ start, end }) => ({ start, end }))
    : [];
  return { shifts, temporary, adjusted: hours.adjusted, fromCalendar };
}

// Side-by-side lanes for overlapping blocks within one day column
function layoutBlocks(items: Omit<BlockItem, 'lane' | 'lanes'>[]): BlockItem[] {
  const sorted = items.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  const result: BlockItem[] = [];
  let cluster: BlockItem[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const finishCluster = () => {
    cluster.forEach(item => { item.lanes = laneEnds.length; });
    result.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  sorted.forEach(item => {
    if (cluster.length > 0 && item.start >= clusterEnd) finishCluster();
    let lane = laneEnds.findIndex(end => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  });
  finishCluster();
  return result;
}

export default function OfficeHoursCalendar<T extends CalendarBesa>({
  besas, onSetDayHours, onWeeklyChange, onMakePermanent, onRemoveHours,
}: OfficeHoursCalendarProps<T>) {
  const [selectedId, setSelectedId] = useState<string>(ALL);
  const [slideIndex, setSlideIndex] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [savingMessage, setSavingMessage] = useState('');
  const [pending, setPending] = useState<PendingChange<T> | null>(null);
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const [addDraft, setAddDraft] = useState<AddDraft | null>(null);
  const [confirmConvert, setConfirmConvert] = useState<ConfirmConvert<T> | null>(null);
  const [removeDraft, setRemoveDraft] = useState<RemoveDraft<T> | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const today = getLocalDateString();
  const showAll = selectedId === ALL || !besas.some(besa => besa.id === selectedId);
  const visible = useMemo(
    () => (showAll ? besas : besas.filter(besa => besa.id === selectedId)),
    [besas, selectedId, showAll]
  );
  const colorOf = (besaId: string) => PALETTE[Math.max(besas.findIndex(besa => besa.id === besaId), 0) % PALETTE.length];

  useEffect(() => {
    setSlideIndex(0);
  }, [selectedId]);

  // Upcoming dates with any temporary change for the BESAs shown
  const changeDates = useMemo(() => [...new Set(visible.flatMap(besa => [
    ...besa.tempAdjustments.map(adj => adj.date),
    ...besa.tempUnavailability.map(entry => entry.date),
  ]))].filter(date => date >= today).sort(), [visible, today]);

  const slides = useMemo(() => {
    const currentWeek = startOfWeek(today);
    const changeWeeks = [...new Set(changeDates.map(startOfWeek))].filter(week => week > currentWeek);
    const result: Slide[] = [{ weekStart: currentWeek }];
    let previousWeek = currentWeek;
    changeWeeks.forEach(week => {
      const gapStart = addDays(previousWeek, 7);
      result.push({ weekStart: week, ...(gapStart < week ? { skipped: { from: gapStart, to: addDays(week, -1) } } : {}) });
      previousWeek = week;
    });
    return result;
  }, [changeDates, today]);

  const currentIndex = Math.min(slideIndex, slides.length - 1);

  // One shared hour range for every slide, padded an hour on each side
  const [rangeStart, rangeEnd] = useMemo(() => {
    let min = 9 * 60;
    let max = 17 * 60;
    slides.forEach(slide => {
      weekDates(slide.weekStart).forEach(date => {
        visible.forEach(besa => {
          const hours = getEffectiveDayHours(besa, date);
          if (hours.available) {
            hours.timeSlots.forEach(slot => {
              min = Math.min(min, toMinutes(slot.start));
              max = Math.max(max, toMinutes(slot.end));
            });
          }
          if (!showAll) {
            getEntriesForDate(besa.tempUnavailability, date).forEach(entry => {
              if (isAllDay(entry)) return;
              min = Math.min(min, toMinutes(entry.start!));
              max = Math.max(max, toMinutes(entry.end!));
            });
          }
        });
      });
    });
    return [Math.max(0, Math.floor(min / 60) * 60 - 60), Math.min(DAY_MINUTES, Math.ceil(max / 60) * 60 + 60)];
  }, [slides, visible, showAll]);

  const minutesToPx = (minutes: number) => ((minutes - rangeStart) / 60) * HOUR_PX;
  const gridHeight = minutesToPx(rangeEnd);
  const hourMarks = Array.from({ length: (rangeEnd - rangeStart) / 60 + 1 }, (_, i) => rangeStart + i * 60);

  // Track the pointer on the window while dragging, so it keeps working outside the block
  useEffect(() => {
    if (!drag || savingDate) return;
    const handleMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current || current.dropped) return;
      const delta = Math.round(((event.clientY - current.startY) / HOUR_PX) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
      const length = current.origEnd - current.origStart;
      const next = current.mode === 'move'
        ? (() => {
          const start = Math.min(Math.max(current.origStart + delta, 0), DAY_MINUTES - length);
          return { ...current, start, end: start + length };
        })()
        : { ...current, end: Math.min(Math.max(current.origEnd + delta, current.origStart + SNAP_MINUTES), DAY_MINUTES) };
      dragRef.current = next;
      setDrag(next);
    };
    const handleUp = () => {
      void commitDrag();
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    // Re-attach only when a drag starts or ends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null, savingDate]);

  const clearDrag = () => {
    dragRef.current = null;
    setDrag(null);
  };

  const commitDrag = async () => {
    const current = dragRef.current;
    const besa = besas.find(entry => entry.id === current?.besaId);
    if (!current || current.dropped || !besa) return;
    if (current.start === current.origStart && current.end === current.origEnd) {
      clearDrag();
      return;
    }

    const day = dayState(besa, current.date);
    const original = getEffectiveDayHours(besa, current.date).timeSlots[current.index];
    // The block stays where it was dropped until the popup is answered
    dragRef.current = { ...current, dropped: true };
    setPending({
      besa,
      date: current.date,
      from: { start: original.start, end: original.end },
      to: { start: toHHMM(current.start), end: toHHMM(current.end) },
      shifts: day.shifts,
      temporary: day.temporary,
      adjusted: day.adjusted,
      scope: 'shift',
    });
  };

  // A pending drag's result for that day: its full hours and which are temporary
  const pendingResult = (change: PendingChange<T>) => change.scope === 'all'
    ? { timeSlots: [change.to], temporary: [change.to] }
    : {
      timeSlots: change.shifts.map(slot => (sameSlot(slot, change.from) ? change.to : slot)),
      temporary: [...change.temporary.filter(slot => !sameSlot(slot, change.from)), change.to],
    };

  const resolvePending = async (choice: 'temporary' | 'permanent' | 'cancel') => {
    const change = pending;
    setPending(null);
    if (!change || choice === 'cancel') {
      clearDrag();
      return;
    }
    setSavingDate(change.date);
    setSavingMessage(choice === 'permanent' && change.besa.officeHoursSource === 'calendar'
      ? `Updating ${change.besa.name}'s weekly hours on Google Calendar…`
      : 'Saving…');
    if (choice === 'temporary') {
      const result = pendingResult(change);
      await onSetDayHours(change.besa, change.date, result.timeSlots, result.temporary, true);
    } else {
      await onWeeklyChange(change.besa, { action: 'change', date: change.date, from: change.from, to: change.to });
    }
    setSavingDate(null);
    setSavingMessage('');
    clearDrag();
  };

  useEffect(() => {
    if (!pending) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void resolvePending('cancel');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const startDrag = (event: ReactPointerEvent, besaId: string, date: string, index: number, mode: DragState['mode'], slot: TimeSlot) => {
    if (event.button !== 0 || savingDate || pending) return;
    event.preventDefault();
    event.stopPropagation();
    const start = toMinutes(slot.start);
    const end = toMinutes(slot.end);
    const next = { besaId, date, index, mode, startY: event.clientY, origStart: start, origEnd: end, start, end };
    dragRef.current = next;
    setDrag(next);
  };

  // Close the right-click menu on any click, scroll, or Escape
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [menu]);

  const inWeeklyHours = (besa: T, date: string, slot: Slot) => {
    const usual = besa.officeHours[getDayKeyForDate(date)];
    return !!usual?.available && usual.timeSlots.some(entry => sameSlot(entry, slot));
  };

  const openAddDialog = (target: ContextMenu) => {
    setMenu(null);
    const start = target.slot ? toMinutes(target.slot.end) : target.minutes ?? 9 * 60;
    const clamped = Math.min(Math.max(start, 0), DAY_MINUTES - 60);
    setAddDraft({
      besaId: target.besaId || besas[0].id,
      date: target.date < today ? today : target.date,
      start: toHHMM(clamped),
      end: toHHMM(clamped + 60),
      mode: 'temporary',
      replace: 'all',
      error: '',
    });
  };

  const runSave = async (message: string, save: () => Promise<boolean>, date: string) => {
    setSavingDate(date);
    setSavingMessage(message);
    await save();
    setSavingDate(null);
    setSavingMessage('');
  };

  // Which shift(s) a temporary add replaces: 'all', 'none', or one shift's key
  const replacedBy = (shifts: Slot[], replace: string) =>
    replace === 'none' ? [] : replace === 'all' ? shifts : shifts.filter(slot => slotKey(slot) === replace);

  const submitAdd = async () => {
    if (!addDraft) return;
    const besa = besas.find(entry => entry.id === addDraft.besaId);
    if (!besa) return;
    const slot = { start: addDraft.start, end: addDraft.end };
    const day = dayState(besa, addDraft.date);
    const replace = addDraft.replace === 'all' || addDraft.replace === 'none' || day.shifts.some(entry => slotKey(entry) === addDraft.replace)
      ? addDraft.replace
      : 'all';
    const replaced = replacedBy(day.shifts, replace);
    let error = '';
    if (!addDraft.date || addDraft.date < today) error = 'Pick today or a later date.';
    else if (!slot.start || !slot.end || slot.start >= slot.end) error = 'End time must be after start time.';
    else {
      // Compare against what it would sit next to: the day's remaining hours, or the weekly hours
      const existing = addDraft.mode === 'temporary'
        ? day.shifts.filter(entry => !replaced.some(other => sameSlot(entry, other)))
        : (besa.officeHours[getDayKeyForDate(addDraft.date)]?.available
          ? besa.officeHours[getDayKeyForDate(addDraft.date)].timeSlots
          : []);
      const overlap = existing.find(entry => entry.start < slot.end && slot.start < entry.end);
      if (overlap) error = `Overlaps their ${formatSlots([overlap])} hours.`;
    }
    if (error) {
      setAddDraft({ ...addDraft, error });
      return;
    }
    setAddDraft(null);
    const fromCalendar = besa.officeHoursSource === 'calendar';
    await runSave(
      addDraft.mode === 'permanent' && fromCalendar ? `Adding ${besa.name}'s weekly hours on Google Calendar…` : 'Saving…',
      () => addDraft.mode === 'permanent'
        ? onWeeklyChange(besa, { action: 'add', date: addDraft.date, to: slot })
        : onSetDayHours(
          besa,
          addDraft.date,
          [...day.shifts.filter(entry => !replaced.some(other => sameSlot(entry, other))), slot],
          [...day.temporary.filter(entry => !replaced.some(other => sameSlot(entry, other))), slot]
        ),
      addDraft.date
    );
  };

  const submitConvert = async () => {
    const change = confirmConvert;
    setConfirmConvert(null);
    if (!change) return;
    if (change.target === 'permanent') {
      await runSave(
        change.besa.officeHoursSource === 'calendar' ? `Updating ${change.besa.name}'s weekly hours on Google Calendar…` : 'Saving…',
        () => onMakePermanent(change.besa, change.date, change.slot),
        change.date
      );
      return;
    }
    // Temporary: that day only. Keep the other shifts, or keep only this one.
    const day = dayState(change.besa, change.date);
    const timeSlots = change.scope === 'all' ? [change.slot] : day.shifts;
    const temporary = change.scope === 'all'
      ? [change.slot]
      : [...day.temporary.filter(entry => !sameSlot(entry, change.slot)), change.slot];
    await runSave('Saving…', () => onSetDayHours(change.besa, change.date, timeSlots, temporary), change.date);
  };

  const submitRemove = async () => {
    const change = removeDraft;
    setRemoveDraft(null);
    if (!change) return;
    const fromCalendar = change.besa.officeHoursSource === 'calendar';
    await runSave(
      change.scope !== 'day' && fromCalendar ? `Removing ${change.besa.name}'s weekly hours on Google Calendar…` : 'Saving…',
      () => onRemoveHours(change.besa, change.date, change.slot, change.scope),
      change.date
    );
  };

  if (besas.length === 0) {
    return <p className="text-sm text-gray-500">No BESAs yet.</p>;
  }

  // Changes in a week, with repeated unavailability of the same name grouped per BESA
  const weekChanges = (weekStart: string) => {
    const dates = new Set(weekDates(weekStart).filter(date => date >= today));
    return visible.flatMap(besa => [
      ...besa.tempAdjustments.filter(adj => dates.has(adj.date)).map(adj => ({
        key: `${besa.id}-a-${adj.id}`,
        besaId: besa.id,
        besaName: besa.name,
        kind: 'adjustment' as const,
        when: formatDate(adj.date, { weekday: 'short', month: 'short', day: 'numeric' }),
        sortDate: adj.date,
        text: `${adj.timeSlots.length ? `Hours ${formatSlots(adj.timeSlots)}` : 'No office hours'}${adj.reason ? ` (${adj.reason})` : ''}`,
      })),
      ...groupUnavailabilityByName(besa.tempUnavailability.filter(entry => dates.has(entry.date))).map(group => ({
        key: `${besa.id}-u-${group.key}`,
        besaId: besa.id,
        besaName: besa.name,
        kind: 'unavailability' as const,
        when: group.entries.length > 1
          ? group.weekdays.join(', ')
          : formatDate(group.firstDate, { weekday: 'short', month: 'short', day: 'numeric' }),
        sortDate: group.firstDate,
        text: `Out ${group.windows.length === 1 ? formatWindow(group.windows[0]) : 'at various times'}` +
          `${group.reason ? ` (${group.reason})` : ''}`,
      })),
    ]).sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.besaName.localeCompare(b.besaName));
  };

  const renderDayColumn = (date: string) => {
    const isPast = date < today;
    const columnItems = layoutBlocks(visible.flatMap((besa, besaIndex) => {
      const hours = getEffectiveDayHours(besa, date);
      if (!hours.available) return [];
      return hours.timeSlots.map((slot, slotIndex) => ({
        besaIndex, slotIndex, slot, start: toMinutes(slot.start), end: toMinutes(slot.end),
      }));
    }));

    return (
      <div
        key={date}
        className={`relative border-l border-gray-100 ${isPast ? 'bg-gray-50' : ''}`}
        style={{ height: gridHeight }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (drag || savingDate) return;
          const offset = e.clientY - e.currentTarget.getBoundingClientRect().top;
          const minutes = Math.round((rangeStart + (offset / HOUR_PX) * 60) / 30) * 30;
          setMenu({ x: e.clientX, y: e.clientY, date, besaId: showAll ? null : visible[0]?.id || null, minutes });
        }}
      >
        {hourMarks.map(mark => (
          <div key={mark} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: minutesToPx(mark) }} />
        ))}

        {columnItems.map(item => {
          const besa = visible[item.besaIndex];
          const hours = getEffectiveDayHours(besa, date);
          const editable = !isPast && savingDate === null;
          const lockedReason = isPast ? 'Past days can’t be changed' : undefined;
          const dragging = drag && drag.besaId === besa.id && drag.date === date && drag.index === item.slotIndex ? drag : null;
          const start = dragging ? dragging.start : item.start;
          const end = dragging ? dragging.end : item.end;
          const colors = showAll
            ? colorOf(besa.id).block
            : hours.adjusted || dragging
              ? 'bg-amber-100 border-amber-400 text-amber-900'
              : 'bg-blue-100 border-blue-400 text-blue-900';
          const adjustedStyle = showAll && hours.adjusted ? 'border-dashed border-2' : 'border';
          const width = 100 / item.lanes;
          // In the All view, unavailability is drawn inside the blocks it overlaps
          const outWindows = showAll
            ? getEntriesForDate(besa.tempUnavailability, date).flatMap(entry => {
              const outStart = isAllDay(entry) ? start : Math.max(toMinutes(entry.start!), start);
              const outEnd = isAllDay(entry) ? end : Math.min(toMinutes(entry.end!), end);
              return outEnd > outStart ? [{ id: entry.id, outStart, outEnd }] : [];
            })
            : [];
          const title = [
            `${besa.name}: ${formatTime(start)} - ${formatTime(end)}`,
            hours.adjusted ? 'Adjusted for this day' : '',
            lockedReason || '',
          ].filter(Boolean).join('\n');

          return (
            <div
              key={`${besa.id}-${item.slotIndex}`}
              title={title}
              onPointerDown={editable ? (e) => startDrag(e, besa.id, date, item.slotIndex, 'move', item.slot) : undefined}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (drag || savingDate) return;
                setMenu({ x: e.clientX, y: e.clientY, date, besaId: besa.id, slot: { start: item.slot.start, end: item.slot.end } });
              }}
              className={`absolute rounded-md ${adjustedStyle} px-1 py-0.5 text-[11px] leading-tight overflow-hidden select-none touch-none
                ${colors} ${isPast ? 'opacity-50' : ''} ${editable ? 'cursor-grab active:cursor-grabbing' : ''}
                ${dragging ? 'shadow-lg z-20' : 'z-10'} ${savingDate === date && dragging ? 'animate-pulse' : ''}`}
              style={{
                top: minutesToPx(start),
                height: Math.max(minutesToPx(end) - minutesToPx(start), 14),
                left: `calc(${item.lane * width}% + 2px)`,
                width: `calc(${width}% - 4px)`,
              }}
            >
              {showAll && <div className="font-semibold truncate">{besa.name}</div>}
              <div className={`${showAll ? '' : 'font-medium'} truncate`}>{formatTime(start)}</div>
              <div className="truncate">to {formatTime(end)}</div>
              {outWindows.map(out => (
                <div
                  key={out.id}
                  className="absolute left-0 right-0 bg-red-500/25 border-y border-red-400 pointer-events-none flex items-start justify-center text-[10px] font-semibold text-red-700"
                  style={{ top: minutesToPx(out.outStart) - minutesToPx(start), height: minutesToPx(out.outEnd) - minutesToPx(out.outStart) }}
                >
                  Out
                </div>
              ))}
              {editable && (
                <div
                  onPointerDown={(e) => startDrag(e, besa.id, date, item.slotIndex, 'resize', item.slot)}
                  className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize"
                  aria-label="Drag to change end time"
                />
              )}
            </div>
          );
        })}

        {/* One BESA: unavailability spans the column, even outside their hours */}
        {!showAll && visible[0] && getEntriesForDate(visible[0].tempUnavailability, date).map(entry => {
          const start = isAllDay(entry) ? rangeStart : Math.max(toMinutes(entry.start!), rangeStart);
          const end = isAllDay(entry) ? rangeEnd : Math.min(toMinutes(entry.end!), rangeEnd);
          return (
            <div
              key={entry.id}
              className="absolute left-0 right-0 z-30 pointer-events-none bg-red-500/15 border-y border-red-300 px-1 text-[10px] font-medium text-red-700"
              style={{ top: minutesToPx(start), height: Math.max(minutesToPx(end) - minutesToPx(start), 12) }}
            >
              {isAllDay(entry) ? 'Out all day' : 'Out'}{entry.reason ? ` · ${entry.reason}` : ''}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayHeader = (date: string) => {
    const adjustedCount = visible.filter(besa => getEffectiveDayHours(besa, date).adjusted).length;
    const outNames = visible.filter(besa => getEntriesForDate(besa.tempUnavailability, date).length > 0).map(besa => besa.name);
    const calendarAdjusted = visible.some(besa =>
      getEntriesForDate(besa.tempAdjustments, date).some(adj => adj.source === 'calendar')
    );
    return (
      <div key={date} className={`px-1 pb-2 text-center ${date === today ? 'text-blue-700' : 'text-gray-700'}`}>
        <div className="text-xs font-medium uppercase tracking-wide">{formatDate(date, { weekday: 'short' })}</div>
        <div className="text-sm font-semibold">{formatDate(date, { month: 'short', day: 'numeric' })}</div>
        <div className="flex flex-wrap justify-center gap-1 mt-1 min-h-[18px]">
          {adjustedCount > 0 && (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 rounded" title={calendarAdjusted ? 'Includes changes from Google Calendar' : undefined}>
              Adjusted{showAll && adjustedCount > 1 ? ` ×${adjustedCount}` : ''}{!showAll && calendarAdjusted ? ' (Cal)' : ''}
            </span>
          )}
          {outNames.length > 0 && (
            <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 rounded" title={showAll ? `Out: ${outNames.join(', ')}` : undefined}>
              Out{showAll && outNames.length > 1 ? ` ×${outNames.length}` : ''}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Saturday and Sunday only show when a BESA shown has hours or is out that day
  const hasAnythingOn = (date: string) => visible.some(besa => {
    const hours = getEffectiveDayHours(besa, date);
    return (hours.available && hours.timeSlots.length > 0) || getEntriesForDate(besa.tempUnavailability, date).length > 0;
  });

  const renderWeek = (slide: Slide) => {
    // weekDates starts on Monday, so indexes 5 and 6 are the weekend
    const dates = weekDates(slide.weekStart).filter((date, index) => index < 5 || hasAnythingOn(date));
    const changes = weekChanges(slide.weekStart);
    return (
      <div key={slide.weekStart} className="w-full shrink-0 px-0.5">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          {changes.length > 0 && (
            <ul className="mb-3 space-y-1 text-xs">
              {changes.map(change => (
                <li key={change.key} className="flex flex-wrap items-center gap-x-2">
                  {showAll && <span className={`h-2 w-2 rounded-full ${colorOf(change.besaId).dot}`} />}
                  {showAll && <span className="font-medium text-gray-900">{change.besaName}</span>}
                  <span className="font-medium text-gray-700">{change.when}</span>
                  <span className={change.kind === 'adjustment' ? 'text-amber-700' : 'text-red-600'}>{change.text}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="overflow-x-auto">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `56px repeat(${dates.length}, minmax(0, 1fr))`,
                minWidth: 56 + dates.length * (showAll ? 130 : 95),
              }}
            >
              <div />
              {dates.map(renderDayHeader)}

              <div className="relative" style={{ height: gridHeight }}>
                {hourMarks.map(mark => (
                  <div key={mark} className="absolute right-2 -translate-y-1/2 text-[10px] text-gray-400" style={{ top: minutesToPx(mark) }}>
                    {mark < DAY_MINUTES ? formatTime(mark) : ''}
                  </div>
                ))}
              </div>
              {dates.map(renderDayColumn)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const slide = slides[currentIndex];

  return (
    <div className="space-y-4">
      {/* BESA tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="BESA">
        {[{ id: ALL, name: 'All' }, ...besas].map(entry => {
          const active = entry.id === ALL ? showAll : entry.id === selectedId;
          return (
            <button
              key={entry.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedId(entry.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border
                ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              {entry.id !== ALL && <span className={`h-2 w-2 rounded-full ${colorOf(entry.id).dot}`} />}
              {entry.name}
            </button>
          );
        })}
      </div>

      {/* Week carousel controls */}
      <div className="bg-white rounded-xl shadow-sm border p-3 flex items-center gap-3">
        <button
          onClick={() => setSlideIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          aria-label="Previous week"
          className="p-2 rounded-lg border text-gray-600 hover:bg-gray-50 disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <div className="text-base font-semibold text-gray-900">
            Week of {formatDate(slide.weekStart, { month: 'short', day: 'numeric', year: 'numeric' })}
            {slide.weekStart === startOfWeek(today) && (
              <span className="ml-2 align-middle text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">This week</span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {slides.length === 1
              ? 'No upcoming changes'
              : `${currentIndex + 1} of ${slides.length} weeks with changes`}
            {slide.skipped && (
              <span className="text-gray-400">
                {' · Skipped '}
                {formatDate(slide.skipped.from, { month: 'short', day: 'numeric' })} – {formatDate(slide.skipped.to, { month: 'short', day: 'numeric' })}
                {' (usual hours)'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setSlideIndex(currentIndex + 1)}
          disabled={currentIndex >= slides.length - 1}
          aria-label="Next week with changes"
          className="p-2 rounded-lg border text-gray-600 hover:bg-gray-50 disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 flex-wrap">
          {slides.map((entry, index) => (
            <button
              key={entry.weekStart}
              onClick={() => setSlideIndex(index)}
              aria-label={`Week of ${formatDate(entry.weekStart, { month: 'short', day: 'numeric' })}`}
              className={`text-xs px-2 py-0.5 rounded-full border ${index === currentIndex ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {formatDate(entry.weekStart, { month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        {showAll ? (
          <>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-2 border-dashed border-gray-400" /> Adjusted for that day</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500/25 border border-red-400" /> Out during their hours</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-100 border border-blue-400" /> Usual hours</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100 border border-amber-400" /> Adjusted for that day</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500/15 border border-red-300" /> Unavailable</span>
          </>
        )}
        <span className="text-gray-500">Drag a block to move it, or drag its bottom edge to change when it ends. Right-click for more options.</span>
      </div>

      {savingMessage && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{savingMessage}</div>
      )}

      {/* Slides */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map(renderWeek)}
        </div>
      </div>

      {/* Right-click menu */}
      {menu && (() => {
        const besa = besas.find(entry => entry.id === menu.besaId);
        const isPast = menu.date < today;
        const weekday = formatDate(menu.date, { weekday: 'long' });
        const shortDate = formatDate(menu.date, { month: 'short', day: 'numeric' });
        const onBlock = !!(besa && menu.slot);
        const weekly = onBlock && inWeeklyHours(besa!, menu.date, menu.slot!);
        const item = (props: { label: string; detail: string; disabled?: boolean; icon: JSX.Element; onSelect: () => void }) => (
          <button
            role="menuitem"
            disabled={props.disabled}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={props.onSelect}
            className="w-full text-left px-3 py-2 flex gap-2.5 hover:bg-gray-50 disabled:opacity-45 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <span className="mt-0.5 shrink-0">{props.icon}</span>
            <span>
              <span className="block text-sm font-medium text-gray-900">{props.label}</span>
              <span className="block text-xs text-gray-500">{props.detail}</span>
            </span>
          </button>
        );
        return (
          <div
            role="menu"
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed z-50 w-72 bg-white rounded-lg shadow-xl border py-1"
            style={{ left: Math.min(menu.x, window.innerWidth - 300), top: Math.min(menu.y, window.innerHeight - 260) }}
          >
            <div className="px-3 py-1.5 text-xs text-gray-500 border-b mb-1">
              {besa ? `${besa.name} · ` : ''}{formatDate(menu.date, { weekday: 'short', month: 'short', day: 'numeric' })}
              {menu.slot ? ` · ${formatSlots([menu.slot])}` : ''}
              {isPast && <span className="block text-gray-400">Past days can’t be changed</span>}
            </div>
            {item({
              label: 'Add office hours…',
              detail: besa ? `More hours for ${besa.name} or someone else` : 'Pick who, when, and whether it repeats',
              icon: <Plus className="h-4 w-4 text-gray-600" />,
              onSelect: () => openAddDialog(menu),
            })}
            {onBlock && (() => {
              const day = dayState(besa!, menu.date);
              const isTemporary = day.temporary.some(entry => sameSlot(entry, menu.slot!));
              return item({
                label: 'Change to temporary hours',
                detail: isTemporary
                  ? `Already temporary for ${shortDate}.`
                  : `Just ${shortDate}. Its event is renamed "(Temporary)"; other weeks stay the same.`,
                disabled: isPast || isTemporary,
                icon: <CalendarClock className="h-4 w-4 text-amber-600" />,
                onSelect: () => {
                  setMenu(null);
                  setConfirmConvert({ besa: besa!, date: menu.date, slot: menu.slot!, target: 'temporary', scope: 'shift' });
                },
              });
            })()}
            {onBlock && item({
              label: 'Change to permanent hours',
              detail: weekly
                ? `Already repeats every ${weekday}.`
                : `Repeats it every ${weekday} from ${shortDate}.`,
              disabled: isPast || weekly,
              icon: <Repeat className="h-4 w-4 text-blue-600" />,
              onSelect: () => {
                setMenu(null);
                setConfirmConvert({ besa: besa!, date: menu.date, slot: menu.slot!, target: 'permanent', scope: 'shift' });
              },
            })}
            {onBlock && item({
              label: 'Remove office hours…',
              detail: 'For this day, every week, or all of their hours',
              disabled: isPast,
              icon: <Trash2 className="h-4 w-4 text-red-500" />,
              onSelect: () => {
                setMenu(null);
                setRemoveDraft({ besa: besa!, date: menu.date, slot: menu.slot!, scope: 'day' });
              },
            })}
          </div>
        );
      })()}

      {/* Add office hours */}
      {addDraft && (() => {
        const besa = besas.find(entry => entry.id === addDraft.besaId);
        const weekday = addDraft.date ? formatDate(addDraft.date, { weekday: 'long' }) : 'week';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setAddDraft(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-hours-title"
              className="w-full max-w-md bg-white rounded-xl shadow-xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="add-hours-title" className="text-lg font-semibold text-gray-900">Add office hours</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="col-span-2 space-y-1">
                  <span className="text-gray-700 font-medium">BESA</span>
                  <select
                    value={addDraft.besaId}
                    onChange={(e) => setAddDraft({ ...addDraft, besaId: e.target.value, error: '' })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg"
                  >
                    {besas.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                  </select>
                </label>
                <label className="col-span-2 space-y-1">
                  <span className="text-gray-700 font-medium">Date</span>
                  <input
                    type="date"
                    min={today}
                    value={addDraft.date}
                    onChange={(e) => setAddDraft({ ...addDraft, date: e.target.value, error: '' })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-gray-700 font-medium">From</span>
                  <input
                    type="time"
                    value={addDraft.start}
                    onChange={(e) => setAddDraft({ ...addDraft, start: e.target.value, error: '' })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-gray-700 font-medium">To</span>
                  <input
                    type="time"
                    value={addDraft.end}
                    onChange={(e) => setAddDraft({ ...addDraft, end: e.target.value, error: '' })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg"
                  />
                </label>
              </div>

              <fieldset className="space-y-2">
                {(['temporary', 'permanent'] as const).map(mode => (
                  <label key={mode} className={`flex gap-2 border rounded-lg p-2.5 cursor-pointer ${addDraft.mode === mode ? 'border-gray-900 bg-gray-50' : ''}`}>
                    <input
                      type="radio"
                      name="add-mode"
                      checked={addDraft.mode === mode}
                      onChange={() => setAddDraft({ ...addDraft, mode, error: '' })}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">
                        {mode === 'temporary' ? 'Temporary: that date only' : `Permanent: every ${weekday}`}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {mode === 'temporary'
                          ? 'Edits that day\'s event on Google Calendar and marks it "(Temporary)", or adds one if there\'s nothing to edit.'
                          : besa?.officeHoursSource === 'calendar'
                            ? `Adds a weekly "${besa.name}'s Availability" event on Google Calendar from that date on.`
                            : "Adds it to their weekly hours on the site. Their hours aren't from Google Calendar, so no calendar event is added."}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {/* Temporary on a day that already has hours: which do these replace? */}
              {addDraft.mode === 'temporary' && besa && (() => {
                const shifts = dayState(besa, addDraft.date).shifts;
                if (shifts.length === 0) return null;
                const valid = addDraft.replace === 'all' || addDraft.replace === 'none' ||
                  shifts.some(entry => slotKey(entry) === addDraft.replace);
                const value = valid ? addDraft.replace : 'all';
                const options = [
                  ...(shifts.length > 1 ? shifts.map(entry => ({ value: slotKey(entry), label: `Replace ${formatSlots([entry])}` })) : []),
                  { value: 'all', label: shifts.length > 1 ? `Replace all ${shifts.length} of their shifts that day` : `Replace their ${formatSlots(shifts)} hours` },
                  { value: 'none', label: 'Keep their hours and add this too' },
                ];
                return (
                  <fieldset className="space-y-1">
                    <legend className="text-sm font-medium text-gray-700 mb-1">Their hours that day</legend>
                    {options.map(option => (
                      <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="radio"
                          name="add-replace"
                          checked={value === option.value}
                          onChange={() => setAddDraft({ ...addDraft, replace: option.value, error: '' })}
                        />
                        {option.label}
                      </label>
                    ))}
                  </fieldset>
                );
              })()}

              {addDraft.error && <p className="text-sm text-red-600">{addDraft.error}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setAddDraft(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={() => void submitAdd()} className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800">Add hours</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirm a right-click conversion */}
      {confirmConvert && (() => {
        const { besa, date, slot, target, scope } = confirmConvert;
        const weekday = formatDate(date, { weekday: 'long' });
        const dayLabel = formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' });
        const fromCalendar = besa.officeHoursSource === 'calendar';
        const others = dayState(besa, date).shifts.filter(entry => !sameSlot(entry, slot));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirmConvert(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="convert-title"
              className="w-full max-w-md bg-white rounded-xl shadow-xl p-5 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="convert-title" className="text-lg font-semibold text-gray-900">
                {target === 'temporary' ? 'Change to temporary hours?' : 'Change to permanent hours?'}
              </h3>
              <p className="text-sm text-gray-700">
                {target === 'temporary'
                  ? `${besa.name}'s ${formatSlots([slot])} on ${dayLabel} becomes a temporary change for that day only. Their other weeks stay the same.`
                  : `${besa.name}'s ${formatSlots([slot])} on ${dayLabel} becomes part of their office hours every ${weekday} from then on.`}
              </p>
              {target === 'temporary' && others.length > 0 && (
                <fieldset className="space-y-1">
                  <legend className="text-sm font-medium text-gray-700 mb-1">Their other hours that day ({formatSlots(others)})</legend>
                  {([
                    ['shift', 'Keep them'],
                    ['all', 'Remove them for that day (only this one stays)'],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="convert-scope"
                        checked={scope === value}
                        onChange={() => setConfirmConvert({ ...confirmConvert, scope: value })}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              )}
              <p className="text-xs text-gray-500">
                {target === 'temporary'
                  ? 'On Google Calendar, that day\'s event is renamed "(Temporary)"' +
                    (scope === 'all' && others.length > 0 ? ' and their other events that day are deleted.' : '.')
                  : fromCalendar
                    ? `Their "${besa.name}'s Availability" weekly events on Google Calendar are updated from ${dayLabel}.`
                    : "Their hours aren't from Google Calendar, so only the site's weekly hours change (for every week)."}
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setConfirmConvert(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button onClick={() => void submitConvert()} className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                  {target === 'temporary' ? 'Make temporary' : 'Make permanent'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Remove office hours */}
      {removeDraft && (() => {
        const { besa, date, slot, scope } = removeDraft;
        const weekday = formatDate(date, { weekday: 'long' });
        const shortDate = formatDate(date, { month: 'short', day: 'numeric' });
        const weekly = inWeeklyHours(besa, date, slot);
        const fromCalendar = besa.officeHoursSource === 'calendar';
        const options: Array<{ value: RemoveDraft<T>['scope']; label: string; detail: string; disabled?: boolean }> = [
          {
            value: 'day',
            label: `Just ${formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}`,
            detail: 'Deletes that day\'s event on Google Calendar. Other weeks stay the same.',
          },
          {
            value: 'weekday',
            label: `Every ${weekday} from ${shortDate}`,
            detail: weekly
              ? fromCalendar
                ? `Their ${weekday} "${besa.name}'s Availability" weekly event stops repeating on Google Calendar.`
                : `Removed from their ${weekday} hours on the site.`
              : `${formatSlots([slot])} isn't part of their weekly ${weekday} hours.`,
            disabled: !weekly,
          },
          {
            value: 'all',
            label: `All of ${besa.name}'s office hours from ${shortDate}`,
            detail: fromCalendar
              ? 'Every weekly "Availability" event of theirs stops repeating on Google Calendar.'
              : 'Clears their weekly hours on the site.',
          },
        ];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setRemoveDraft(null)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-title"
              className="w-full max-w-md bg-white rounded-xl shadow-xl p-5 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="remove-title" className="text-lg font-semibold text-gray-900">Remove {besa.name}'s office hours</h3>
              <p className="text-sm text-gray-600">{formatSlots([slot])}</p>
              <fieldset className="space-y-2">
                {options.map(option => (
                  <label
                    key={option.value}
                    className={`flex gap-2 border rounded-lg p-2.5 ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${scope === option.value ? 'border-gray-900 bg-gray-50' : ''}`}
                  >
                    <input
                      type="radio"
                      name="remove-scope"
                      disabled={option.disabled}
                      checked={scope === option.value}
                      onChange={() => setRemoveDraft({ ...removeDraft, scope: option.value })}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                      <span className="block text-xs text-gray-500">{option.detail}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setRemoveDraft(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button
                  onClick={() => void submitRemove()}
                  disabled={options.find(option => option.value === scope)?.disabled}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Temporary or permanent? */}
      {pending && (() => {
        const weekday = formatDate(pending.date, { weekday: 'long' });
        const dayLabel = formatDate(pending.date, { weekday: 'long', month: 'short', day: 'numeric' });
        const fromCalendar = pending.besa.officeHoursSource === 'calendar';
        const usual = pending.besa.officeHours[getDayKeyForDate(pending.date)];
        const backToUsual = sameSlots(usual?.available ? usual.timeSlots : [], pendingResult(pending).timeSlots);
        const others = pending.shifts.filter(entry => !sameSlot(entry, pending.from));
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => void resolvePending('cancel')}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="change-dialog-title"
              className="w-full max-w-md bg-white rounded-xl shadow-xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 id="change-dialog-title" className="text-lg font-semibold text-gray-900">
                  Change {pending.besa.name}'s hours
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {dayLabel}: {formatSlots([pending.from])} → <span className="font-medium text-gray-900">{formatSlots([pending.to])}</span>
                </p>
              </div>

              {others.length > 0 && (
                <fieldset className="space-y-1">
                  <legend className="text-sm font-medium text-gray-700 mb-1">Their other hours that day ({formatSlots(others)})</legend>
                  {([
                    ['shift', 'Keep them (replace only this shift)'],
                    ['all', 'Replace all of their shifts that day with this'],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="drag-scope"
                        checked={pending.scope === value}
                        onChange={() => setPending({ ...pending, scope: value })}
                      />
                      {label}
                    </label>
                  ))}
                  <p className="text-xs text-gray-500">Only for the temporary option.</p>
                </fieldset>
              )}

              <button
                onClick={() => void resolvePending('temporary')}
                className="w-full text-left border rounded-lg p-3 hover:border-amber-400 hover:bg-amber-50 flex gap-3"
              >
                <CalendarClock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <span className="block font-medium text-gray-900">
                    {backToUsual ? 'Back to usual hours' : `Temporary: just ${dayLabel}`}
                  </span>
                  <span className="block text-xs text-gray-600 mt-0.5">
                    {backToUsual
                      ? 'Removes the temporary change for that day and puts their Google Calendar events back.'
                      : 'Edits that day\'s event on Google Calendar and marks it "(Temporary)". Other weeks stay the same.'}
                  </span>
                </span>
              </button>

              {!backToUsual && (
                <button
                  onClick={() => void resolvePending('permanent')}
                  disabled={pending.adjusted}
                  className="w-full text-left border rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 flex gap-3 disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:cursor-not-allowed"
                >
                  <Repeat className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <span className="block font-medium text-gray-900">
                      Permanent: every {weekday} from {formatDate(pending.date, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="block text-xs text-gray-600 mt-0.5">
                      {pending.adjusted
                        ? 'This day already has adjusted hours. To change the weekly schedule, drag a day that uses their usual hours.'
                        : fromCalendar
                          ? `Changes their weekly office hours and the "${pending.besa.name}'s Availability" recurring event on Google Calendar from that date on. Earlier weeks stay as they were.`
                          : "Changes their weekly office hours on the site. Their hours aren't from Google Calendar, so no calendar event is changed."}
                    </span>
                  </span>
                </button>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => void resolvePending('cancel')}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
