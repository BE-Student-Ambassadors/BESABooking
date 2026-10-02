import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getDayKeyForDate,
  getEffectiveDayHours,
  getEntriesForDate,
  getLocalDateString,
  sameSlots,
} from '../../../functions/besaTempSchedule.ts';

// Weekly calendar view of one BESA's office hours. Shows this week plus every week that has
// an upcoming temporary change; the weeks in between collapse to a single row of dates.
// Dragging a block (or its bottom edge) on today or a later day saves a one-day change.

export type CalendarBesa = {
  id: string;
  name: string;
  email: string;
  officeHours: Record<string, DayHours>;
  tempAdjustments: TempAdjustment[];
  tempUnavailability: TempUnavailability[];
};

interface OfficeHoursCalendarProps<T extends CalendarBesa> {
  besas: T[];
  // Saves `timeSlots` as that date's hours; resolves to false if the save failed.
  onChangeDayHours: (besa: T, date: string, timeSlots: TimeSlot[]) => Promise<boolean>;
}

type Section =
  | { kind: 'week'; weekStart: string }
  | { kind: 'gap'; from: string; to: string };

type DragState = {
  date: string;
  index: number;
  mode: 'move' | 'resize';
  startY: number;
  origStart: number;
  origEnd: number;
  start: number;
  end: number;
};

const HOUR_PX = 44;
const SNAP_MINUTES = 15;
const DAY_MINUTES = 24 * 60;

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

const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  parseDate(date).toLocaleDateString('en-US', options);

export default function OfficeHoursCalendar<T extends CalendarBesa>({ besas, onChangeDayHours }: OfficeHoursCalendarProps<T>) {
  const [selectedBesaId, setSelectedBesaId] = useState('');
  const [changeIndex, setChangeIndex] = useState(-1);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const weekRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const today = getLocalDateString();
  const besa = besas.find(entry => entry.id === selectedBesaId) || besas[0];

  useEffect(() => {
    setChangeIndex(-1);
  }, [besa?.id]);

  // Every upcoming date with a temporary change, with a short description for the arrows
  const changes = useMemo(() => {
    if (!besa) return [];
    const dates = [...new Set([
      ...besa.tempAdjustments.map(adj => adj.date),
      ...besa.tempUnavailability.map(entry => entry.date),
    ])].filter(date => date >= today).sort();
    return dates.map(date => {
      const parts: string[] = [];
      const adjusted = getEntriesForDate(besa.tempAdjustments, date);
      if (adjusted.length > 0) parts.push(`Adjusted hours: ${formatSlots(adjusted.flatMap(adj => adj.timeSlots))}`);
      getEntriesForDate(besa.tempUnavailability, date).forEach(entry => {
        parts.push(entry.allDay || !entry.start || !entry.end
          ? 'Out all day'
          : `Out ${formatTime(toMinutes(entry.start))} - ${formatTime(toMinutes(entry.end))}`);
      });
      return { date, label: parts.join(' · ') };
    });
  }, [besa, today]);

  const sections = useMemo(() => {
    const currentWeek = startOfWeek(today);
    const changeWeeks = [...new Set(changes.map(change => startOfWeek(change.date)))].filter(week => week > currentWeek);
    const result: Section[] = [{ kind: 'week', weekStart: currentWeek }];
    let previousWeek = currentWeek;
    changeWeeks.forEach(week => {
      const gapStart = addDays(previousWeek, 7);
      if (gapStart < week) result.push({ kind: 'gap', from: gapStart, to: addDays(week, -1) });
      result.push({ kind: 'week', weekStart: week });
      previousWeek = week;
    });
    return result;
  }, [changes, today]);

  const weekDates = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // One shared hour range for every grid, padded an hour on each side
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (!besa) return [8 * 60, 18 * 60];
    let min = 9 * 60;
    let max = 17 * 60;
    sections.forEach(section => {
      if (section.kind !== 'week') return;
      weekDates(section.weekStart).forEach(date => {
        const hours = getEffectiveDayHours(besa, date);
        if (hours.available) {
          hours.timeSlots.forEach(slot => {
            min = Math.min(min, toMinutes(slot.start));
            max = Math.max(max, toMinutes(slot.end));
          });
        }
        getEntriesForDate(besa.tempUnavailability, date).forEach(entry => {
          if (entry.allDay || !entry.start || !entry.end) return;
          min = Math.min(min, toMinutes(entry.start));
          max = Math.max(max, toMinutes(entry.end));
        });
      });
    });
    return [Math.max(0, Math.floor(min / 60) * 60 - 60), Math.min(DAY_MINUTES, Math.ceil(max / 60) * 60 + 60)];
  }, [besa, sections]);

  const minutesToPx = (minutes: number) => ((minutes - rangeStart) / 60) * HOUR_PX;
  const gridHeight = minutesToPx(rangeEnd);

  // Track the pointer on the window while dragging, so it keeps working outside the block
  useEffect(() => {
    if (!drag || savingDate) return;
    const handleMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
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
    if (!current || !besa) return;
    if (current.start === current.origStart && current.end === current.origEnd) {
      clearDrag();
      return;
    }

    const dayHours = getEffectiveDayHours(besa, current.date);
    const timeSlots = dayHours.timeSlots.map((slot, index) =>
      index === current.index ? { ...slot, start: toHHMM(current.start), end: toHHMM(current.end) } : slot
    );
    const usual = besa.officeHours[getDayKeyForDate(current.date)];
    const backToUsual = !!usual?.available && sameSlots(usual.timeSlots, timeSlots);
    const dateLabel = formatDate(current.date, { weekday: 'long', month: 'long', day: 'numeric' });
    const message = backToUsual
      ? `Change ${besa.name}'s hours on ${dateLabel} back to their usual ${formatSlots(timeSlots)}?\n\n` +
        'This removes the temporary change for that day, including its Google Calendar event.'
      : `Change ${besa.name}'s hours on ${dateLabel} to ${formatSlots(timeSlots)}?\n\n` +
        `This is a temporary change for that day only. It will show on Google Calendar as "${besa.name}'s Availability (Temporary)".`;

    if (!confirm(message)) {
      clearDrag();
      return;
    }
    setSavingDate(current.date);
    await onChangeDayHours(besa, current.date, timeSlots);
    setSavingDate(null);
    clearDrag();
  };

  const startDrag = (event: ReactPointerEvent, date: string, index: number, mode: DragState['mode'], slot: TimeSlot) => {
    if (event.button !== 0 || savingDate) return;
    event.preventDefault();
    event.stopPropagation();
    const start = toMinutes(slot.start);
    const end = toMinutes(slot.end);
    const next = { date, index, mode, startY: event.clientY, origStart: start, origEnd: end, start, end };
    dragRef.current = next;
    setDrag(next);
  };

  const goToChange = (index: number) => {
    const change = changes[index];
    if (!change) return;
    setChangeIndex(index);
    weekRefs.current[startOfWeek(change.date)]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!besa) {
    return <p className="text-sm text-gray-500">No BESAs yet.</p>;
  }

  const highlightedDate = changes[changeIndex]?.date;

  const renderWeek = (weekStart: string) => {
    const dates = weekDates(weekStart);
    const hourMarks = Array.from({ length: (rangeEnd - rangeStart) / 60 + 1 }, (_, i) => rangeStart + i * 60);
    return (
      <div
        key={weekStart}
        ref={el => { weekRefs.current[weekStart] = el; }}
        className="bg-white rounded-xl shadow-sm border p-4 scroll-mt-24"
      >
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-base font-semibold text-gray-900">
            Week of {formatDate(weekStart, { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          {weekStart === startOfWeek(today) && (
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">This week</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[720px] grid" style={{ gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))' }}>
            <div />
            {dates.map(date => {
              const hours = getEffectiveDayHours(besa, date);
              const fromCalendar = getEntriesForDate(besa.tempAdjustments, date).some(adj => adj.source === 'calendar');
              const out = getEntriesForDate(besa.tempUnavailability, date).length > 0;
              return (
                <div key={date} className={`px-1 pb-2 text-center ${date === today ? 'text-blue-700' : 'text-gray-700'}`}>
                  <div className="text-xs font-medium uppercase tracking-wide">{formatDate(date, { weekday: 'short' })}</div>
                  <div className="text-sm font-semibold">{formatDate(date, { month: 'short', day: 'numeric' })}</div>
                  <div className="flex flex-wrap justify-center gap-1 mt-1 min-h-[18px]">
                    {hours.adjusted && (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 rounded" title={fromCalendar ? 'Changed in Google Calendar' : undefined}>
                        Adjusted{fromCalendar ? ' (Cal)' : ''}
                      </span>
                    )}
                    {out && <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 rounded">Out</span>}
                  </div>
                </div>
              );
            })}

            {/* Hour labels */}
            <div className="relative" style={{ height: gridHeight }}>
              {hourMarks.map(mark => (
                <div key={mark} className="absolute right-2 -translate-y-1/2 text-[10px] text-gray-400" style={{ top: minutesToPx(mark) }}>
                  {mark < DAY_MINUTES ? formatTime(mark) : ''}
                </div>
              ))}
            </div>

            {dates.map(date => {
              const hours = getEffectiveDayHours(besa, date);
              const unavailability = getEntriesForDate(besa.tempUnavailability, date);
              const fromCalendar = getEntriesForDate(besa.tempAdjustments, date).some(adj => adj.source === 'calendar');
              const isPast = date < today;
              const editable = !isPast && !fromCalendar && savingDate === null;
              const lockedReason = isPast
                ? 'Past days can’t be changed'
                : fromCalendar
                  ? 'This day was changed in Google Calendar. Edit it there.'
                  : undefined;
              return (
                <div
                  key={date}
                  className={`relative border-l border-gray-100 ${isPast ? 'bg-gray-50' : ''} ${date === highlightedDate ? 'ring-2 ring-amber-400 ring-inset rounded' : ''}`}
                  style={{ height: gridHeight }}
                >
                  {hourMarks.map(mark => (
                    <div key={mark} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: minutesToPx(mark) }} />
                  ))}

                  {hours.available && hours.timeSlots.map((slot, index) => {
                    const dragging = drag && drag.date === date && drag.index === index ? drag : null;
                    const start = dragging ? dragging.start : toMinutes(slot.start);
                    const end = dragging ? dragging.end : toMinutes(slot.end);
                    const colors = hours.adjusted || dragging
                      ? 'bg-amber-100 border-amber-400 text-amber-900'
                      : 'bg-blue-100 border-blue-400 text-blue-900';
                    return (
                      <div
                        key={slot.id || index}
                        title={lockedReason}
                        onPointerDown={editable ? (e) => startDrag(e, date, index, 'move', slot) : undefined}
                        className={`absolute left-1 right-1 rounded-md border px-1.5 py-1 text-[11px] leading-tight overflow-hidden select-none touch-none
                          ${colors} ${isPast ? 'opacity-50' : ''} ${editable ? 'cursor-grab active:cursor-grabbing' : ''}
                          ${dragging ? 'shadow-lg z-20' : 'z-10'} ${savingDate === date ? 'animate-pulse' : ''}`}
                        style={{ top: minutesToPx(start), height: Math.max(minutesToPx(end) - minutesToPx(start), 14) }}
                      >
                        <div className="font-medium">{formatTime(start)}</div>
                        <div>to {formatTime(end)}</div>
                        {editable && (
                          <div
                            onPointerDown={(e) => startDrag(e, date, index, 'resize', slot)}
                            className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize"
                            aria-label="Drag to change end time"
                          />
                        )}
                      </div>
                    );
                  })}

                  {unavailability.map(entry => {
                    const allDay = entry.allDay || !entry.start || !entry.end;
                    const start = allDay ? rangeStart : Math.max(toMinutes(entry.start!), rangeStart);
                    const end = allDay ? rangeEnd : Math.min(toMinutes(entry.end!), rangeEnd);
                    return (
                      <div
                        key={entry.id}
                        className="absolute left-0 right-0 z-30 pointer-events-none bg-red-500/15 border-y border-red-300 px-1 text-[10px] font-medium text-red-700"
                        style={{ top: minutesToPx(start), height: Math.max(minutesToPx(end) - minutesToPx(start), 12) }}
                      >
                        {allDay ? 'Out all day' : 'Out'}{entry.reason ? ` · ${entry.reason}` : ''}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap items-center gap-3 justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <label htmlFor="calendar-besa" className="text-sm font-medium text-gray-700">BESA</label>
          <select
            id="calendar-besa"
            value={besa.id}
            onChange={(e) => setSelectedBesaId(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
          >
            {besas.map(entry => (
              <option key={entry.id} value={entry.id}>{entry.name}</option>
            ))}
          </select>
        </div>

        {/* Step through upcoming temporary changes */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => goToChange(changeIndex - 1)}
            disabled={changeIndex <= 0}
            aria-label="Previous change"
            className="p-1.5 rounded-lg border text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm text-gray-700 min-w-0">
            {changes.length === 0 ? (
              <span className="text-gray-500">No upcoming changes</span>
            ) : changeIndex < 0 ? (
              <span>{changes.length} upcoming change{changes.length === 1 ? '' : 's'}</span>
            ) : (
              <span>
                <span className="font-medium">
                  {formatDate(changes[changeIndex].date, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span className="text-gray-500"> · {changes[changeIndex].label}</span>
                <span className="text-gray-400"> ({changeIndex + 1}/{changes.length})</span>
              </span>
            )}
          </div>
          <button
            onClick={() => goToChange(changeIndex + 1)}
            disabled={changeIndex >= changes.length - 1}
            aria-label="Next change"
            className="p-1.5 rounded-lg border text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-100 border border-blue-400" /> Usual hours</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100 border border-amber-400" /> Adjusted for that day</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500/15 border border-red-300" /> Unavailable</span>
        <span className="text-gray-500">Drag a block to move it, or drag its bottom edge to change when it ends.</span>
      </div>

      {sections.map(section =>
        section.kind === 'week' ? (
          renderWeek(section.weekStart)
        ) : (
          <div key={section.from} className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500">
            {formatDate(section.from, { month: 'short', day: 'numeric' })} – {formatDate(section.to, { month: 'short', day: 'numeric', year: 'numeric' })}
            <span className="text-gray-400"> · Usual weekly hours, no changes</span>
          </div>
        )
      )}
    </div>
  );
}
