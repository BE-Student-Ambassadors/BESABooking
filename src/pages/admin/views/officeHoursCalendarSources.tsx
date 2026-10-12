import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarRange, ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import api from '../../../api';

type CalendarSettings = { calendarIds: string[]; updatedAt: string | null };

// Google Calendars the office-hours sync reads BESA availability from. Saving the list makes
// the Firebase Functions re-watch the calendars and recompute everyone's office hours.
export default function OfficeHoursCalendarSources({ onChanged }: { onChanged?: () => void }) {
  const [calendarIds, setCalendarIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [newId, setNewId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  useEffect(() => {
    api.get<CalendarSettings>('/api/admin/office-hours/calendars')
      .then(({ data }) => setCalendarIds(data.calendarIds))
      .catch((err) => console.error('Error fetching office hours calendars:', err));
  }, []);

  const save = async (next: string[]) => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put<CalendarSettings>('/api/admin/office-hours/calendars', { calendarIds: next });
      setCalendarIds(data.calendarIds);
      // The re-sync runs in the background; give it a moment before reloading hours.
      setTimeout(() => onChanged?.(), 15000);
      return true;
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string; error?: string } } }).response?.data;
      setError(message?.message || message?.error || 'Could not save the calendar list.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addCalendar = async () => {
    const id = newId.trim();
    if (!id) return;
    if (calendarIds.includes(id)) {
      setError('That calendar is already connected.');
      return;
    }
    if (id !== 'primary' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) {
      setError("That doesn't look like a Google Calendar ID (it should look like an email address).");
      return;
    }
    if (await save([...calendarIds, id])) setNewId('');
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    if (await save(calendarIds.filter((id) => id !== pendingRemoval))) setPendingRemoval(null);
  };

  const label = (id: string) => (id === 'primary' ? "BESA account's own calendar (primary)" : id);

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border">
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-xl"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          {expanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
          <CalendarRange className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Connected Google Calendars</h2>
            <p className="text-sm text-gray-500">
              {calendarIds.length} calendar{calendarIds.length === 1 ? '' : 's'} synced into office hours
            </p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Availability events on these calendars set BESA office hours. The BESA Google account must have
            access to any calendar you add.
          </p>

          <ul className="divide-y border rounded-lg">
            {calendarIds.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm text-gray-800 break-all">{label(id)}</span>
                <button
                  onClick={() => setPendingRemoval(id)}
                  disabled={saving || calendarIds.length === 1}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0"
                  title={calendarIds.length === 1 ? 'At least one calendar must stay connected' : 'Remove calendar'}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void addCalendar(); }}
              placeholder="Calendar ID, e.g. c_…@group.calendar.google.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={() => void addCalendar()}
              disabled={saving || !newId.trim()}
              className="flex items-center justify-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Plus className="h-4 w-4" />
              Add calendar
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {pendingRemoval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                Remove this calendar?
              </h3>
              <button onClick={() => setPendingRemoval(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="text-sm text-gray-800 break-all mb-3 font-medium">{label(pendingRemoval)}</p>
            <p className="text-sm text-gray-600 mb-2">
              This is not recommended. Once removed, the site stops reading this calendar:
            </p>
            <ul className="text-sm text-gray-600 list-disc pl-5 mb-4 space-y-1">
              <li>Weekly office hours, temporary changes, and time off from its events are dropped on the next sync.</li>
              <li>BESAs whose availability lives only on this calendar may show no office hours and stop getting assigned tours.</li>
              <li>Changes made on this calendar will no longer reach the site.</li>
            </ul>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingRemoval(null)}
                className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-700 hover:bg-gray-50">
                Keep calendar
              </button>
              <button
                onClick={() => void confirmRemoval()}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Removing…' : 'Remove anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
