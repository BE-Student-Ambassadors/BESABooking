import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Search, Loader2, Trash2, Save } from "lucide-react";
import api from "../api.ts";

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const normalizeWeeklyHours = (weeklyHours?: WeeklyHours): WeeklyHours =>
  DAYS_OF_WEEK.reduce<WeeklyHours>((acc, day) => {
    acc[day] = [...(weeklyHours?.[day] || [])];
    return acc;
  }, {});

const normalizeAvailabilityRanges = (tourLike: Partial<Tour>): AvailabilityRange[] => {
  if (tourLike.availabilityRanges?.length) {
    return tourLike.availabilityRanges.map((range) => ({
      startDate: range.startDate || "",
      endDate: range.endDate || "",
      weeklyHours: normalizeWeeklyHours(range.weeklyHours),
    }));
  }

  return [{
    startDate: tourLike.startDate || "",
    endDate: tourLike.endDate || "",
    weeklyHours: normalizeWeeklyHours(tourLike.weeklyHours),
  }];
};

type BookingDoc = {
  bookingId?: string;
  calendarEventId?: string;
  startTimeISO?: string;
  endTimeISO?: string;
  tourId?: string;
  tourType?: string;
  date?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  maxAttendees?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
};

const ModifyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [refCode, setRefCode] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [tour, setTour] = useState<Tour | null>(null);
  const [reason, setReason] = useState("");
  const [lastName, setLastName] = useState("");

  const resetState = () => {
    setBooking(null);
    setBookingId(null);
    setDate("");
    setTime("");
    setError(null);
    setTour(null);
    setReason("");
    setLastName("");
  };

  const handleLookup = async () => {
    const idInput = refCode.trim();
    const lastInput = lastName.trim();
    if (!idInput && !lastInput) {
      setError("Enter a booking ID or last name to search.");
      return;
    }
    setError(null);
    setLoading(true);
    resetState();
    try {
      //actual part of lookup
      const response = await( await api.get("/api/bookings/lookup", {params: {id: idInput, lastName: lastInput}})).data
      console.log(response)
      if (response?.message.length > 0) setError(response.message)
      if (!response?.query) return 
      const data = response.query
      const booking = data.booking as BookingDoc
      setTour({...data.tour as Tour})
      setBookingId(data?.booking_id || null)
      setBooking(booking)
      setDate(booking.date || "")
      setTime(booking.time || booking.startTime || "")

    } catch (err) {
      console.error("Lookup error:", err);
      setError("Could not fetch booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!bookingId || !date || !time) {
      setError("Please pick a new date and time.");
      return;
    }

    // convert 24h input ("14:00") to "2:00 PM" to stay consistent with stored bookings
    const to12Hour = (value: string) => {
      if (!value || !value.includes(":")) return value;
      const [hStr, mStr] = value.split(":");
      let h = parseInt(hStr, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${mStr} ${ampm}`;
    };

    const formattedTime = to12Hour(time);
    const durationMinutes =
      tour?.durationUnit === "hours" || tour?.durationUnit === "hour"
        ? (tour?.duration || 0) * 60
        : tour?.duration || 0;

    const parseLocalDateTime = (dateStr: string, timeLabel: string) => {
      const m = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!m) return null;
      let [, hhStr, mmStr, ampm] = m;
      let hh = parseInt(hhStr, 10);
      const mm = parseInt(mmStr, 10);
      if (/PM/i.test(ampm) && hh !== 12) hh += 12;
      if (/AM/i.test(ampm) && hh === 12) hh = 0;
      const [Y, M, D] = dateStr.split("-").map(Number);
      return new Date(Y, (M - 1), D, hh, mm, 0, 0);
    };

    const formatTime12 = (dt: Date) => {
      const h = dt.getHours();
      const m = dt.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    const toLocalISO = (dt: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const offMin = dt.getTimezoneOffset();
      const sign = offMin > 0 ? "-" : "+";
      const abs = Math.abs(offMin);
      const offH = pad(Math.floor(abs / 60));
      const offM = pad(abs % 60);
      return (
        `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` +
        `T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}` +
        `${sign}${offH}:${offM}`
      );
    };

    let computedEndTime: string | undefined = undefined;
    let startISO: string | undefined = undefined;
    let endISO: string | undefined = undefined;

    const startDt = parseLocalDateTime(date, formattedTime);
    if (startDt && durationMinutes > 0) {
      const endDt = new Date(startDt.getTime() + durationMinutes * 60000);
      computedEndTime = formatTime12(endDt);
      startISO = toLocalISO(startDt);
      endISO = toLocalISO(endDt);
    }

    // ---- validation against tour rules ----
    const toMinutes = (t: string) => {
      if (!t || !t.includes(":")) return -1;
      const [h, mPart] = t.split(":");
      const [m, ampmMaybe] = mPart.split(" ");
      let mins = parseInt(h, 10) % 12 * 60 + parseInt(m, 10);
      if (ampmMaybe?.toUpperCase() === "PM") mins += 12 * 60;
      // if already 24h, ampmMaybe undefined, above still fine
      if (!ampmMaybe && h.length === 2) {
        const hh = parseInt(h, 10);
        mins = hh * 60 + parseInt(m, 10);
      }
      return mins;
    };

    const isDateBlocked = (dt: Date, t: Tour, allTours: Tour[] = []) => {
      // tour-level blocks
      const blocked = (t.dateSpecificBlockDays || []).find(d => {
        const start = new Date(d.startDate + "T00:00:00");
        const end = new Date((d.endDate || d.startDate) + "T23:59:59");
        return dt >= start && dt <= end;
      });
      if (blocked?.unavailable) return true;

      // global holiday blocks
      const globalHit = allTours.some((tour) =>
        (tour.dateSpecificBlockDays || []).some((d) => {
          if (!d.appliesToAllTours || !d.unavailable) return false;
          const start = new Date(d.startDate + "T00:00:00");
          const end = new Date((d.endDate || d.startDate) + "T23:59:59");
          return dt >= start && dt <= end;
        })
      );
      if (globalHit) return true;

      if (blocked?.slots && blocked.slots.length) return false;
      return false;
    };


    const generateSlots = (start: string, end: string, durationMins: number, freqMins: number) => {
      const startM = toMinutes(start);
      const endM = toMinutes(end);
      if (startM < 0 || endM < 0 || durationMins <= 0 || freqMins <= 0) return [] as number[];
      const slots: number[] = [];
      for (let m = startM; m + durationMins <= endM; m += freqMins) {
        slots.push(m);
      }
      return slots;
    };

    const isDateWithinRange = (dateStr: string, start?: string, end?: string) => {
      if (!start) return false;
      const dateVal = new Date(dateStr + "T00:00:00");
      const startVal = new Date(start + "T00:00:00");
      const endVal = end ? new Date(end + "T23:59:59") : new Date(start + "T23:59:59");
      return dateVal >= startVal && dateVal <= endVal;
    };

    const getMatchingAvailabilityRange = (dateStr: string, currentTour: Tour) =>
      normalizeAvailabilityRanges(currentTour).find((range) =>
        isDateWithinRange(dateStr, range.startDate, range.endDate)
      );

    const hasSlotForDateTime = (dt: Date, formatted: string, t: Tour) => {
      const weekday = dt.toLocaleDateString("en-US", { weekday: "long" });
      const minutes = toMinutes(formatted);
      if (minutes < 0) return false;

      const durationMinutes =
        t.durationUnit === "hours" || t.durationUnit === "hour"
          ? (t.duration || 0) * 60
          : t.duration || 0;
      const freqMinutes =
        t.frequencyUnit === "hours" || t.frequencyUnit === "hour"
          ? (t.frequency || 0) * 60
          : t.frequency || durationMinutes || 60;

      // check date-specific slots first (if a range with slots is present)
      const override = (t.dateSpecificBlockDays || []).find(d => {
        const start = new Date(d.startDate + "T00:00:00");
        const end = new Date((d.endDate || d.startDate) + "T23:59:59");
        return dt >= start && dt <= end;
      });
      const matchingRange = getMatchingAvailabilityRange(
        `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`,
        t
      );

      const slotWindows = override?.slots?.length
        ? override.slots
        : matchingRange?.weeklyHours?.[weekday] || t.weeklyHours?.[weekday] || [];

      if (!slotWindows || slotWindows.length === 0) return false;

      const blockedMinutes = new Set<number>();
      (override?.blockedTimes || []).forEach((time) => {
        const parsed = toMinutes(time);
        if (parsed >= 0) blockedMinutes.add(parsed);
      });
      const blockedRanges: Array<{ start: number; end: number }> = [];
      (override?.blockedRanges || []).forEach((range) => {
        const start = toMinutes(range.start);
        const end = toMinutes(range.end);
        if (start >= 0 && end >= 0 && start < end) {
          blockedRanges.push({ start, end });
        }
      });
      if (blockedMinutes.has(minutes)) return false;
      if (blockedRanges.some((range) => minutes < range.end && range.start < minutes + durationMinutes)) return false;

      // Require an exact generated slot match (prevents arbitrary times inside a window)
      return slotWindows.some((window) => {
        const startM = toMinutes(window.start);
        const endM = toMinutes(window.end);
        if (startM < 0 || endM < 0) return false;
        const generated = generateSlots(window.start, window.end, durationMinutes, freqMinutes);
        return generated.includes(minutes);
      });
    };

    if (tour) {
      const selectedDate = new Date(date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setError("That date is in the past.");
        return;
      }

      // basic window checks
      if (tour.startDate) {
        const start = new Date(tour.startDate + "T00:00:00");
        if (selectedDate < start) {
          setError(`Tour starts on ${start.toLocaleDateString()}.`);
          return;
        }
      }
      if (tour.endDate) {
        const end = new Date(tour.endDate + "T23:59:59");
        if (selectedDate > end) {
          setError(`Tour ends on ${end.toLocaleDateString()}.`);
          return;
        }
      }

      if (isDateBlocked(selectedDate, tour)) {
        setError("That date is unavailable for this tour.");
        return;
      }

      if (!hasSlotForDateTime(selectedDate, formattedTime, tour)) {
        setError("Selected time is outside available hours for that date/tour.");
        return;
      }
    }
    
    setSaving(true);
    setError(null);

    try {
      const updates = {
        date,
        time: formattedTime,
        startTime: formattedTime,
        ...(computedEndTime ? { endTime: computedEndTime } : {}),
        ...(startISO ? { startTimeISO: startISO } : {}),
        ...(endISO ? { endTimeISO: endISO } : {}),
        modificationReason: reason,
        updatedAt: new Date().toISOString(),
      };
      const response = await api.patch("/api/bookings/" + bookingId + "/reschedule", updates)
      
      // Prevent overlapping with any other tour at the same time
      if (!response.data?.payload) {
        setError(response.data?.message)
        return
      }

      setBooking({
        ...booking,
        bookingId,
        ...updates,
      });
      setError("Changes saved. Your booking has been updated.");
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!bookingId) return;
    const confirm = window.confirm("Cancel this booking? This cannot be undone.");
    if (!confirm) return;
    setSaving(true);
    setError(null);
    try {
      await api.delete("/api/bookings/" + bookingId);
      resetState();
      setError("Booking canceled.");
    } catch (err) {
      console.error("Cancel error:", err);
      setError("Failed to cancel booking. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Modify Booking</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Find Your Booking</label>
            <p className="text-sm text-gray-500">
             Enter the last name associated with the booking or the confirmation number.
            </p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                OR
              </div>
              <input
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                placeholder="Confirmation Number"
                className="rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleLookup}
                className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="ml-2">Lookup</span>
              </button>
            </div>
          </div>

          {booking && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{booking.tourType || "Tour"}</h3>
                <p className="text-sm text-gray-700">
                  Current: {booking.date} at {booking.time || booking.startTime}
                </p>
                <p className="text-sm text-gray-700">
                  Name: {booking.firstName} {booking.lastName}
                </p>
                <p className="text-sm text-gray-700">Email: {booking.email}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm text-gray-800 flex flex-col gap-1">
                  New Date
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </label>
                <label className="text-sm text-gray-800 flex flex-col gap-1">
                  New Time
                  <div className="relative">
                    <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </label>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-800">
                  Any notes for us about this change?
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Share anything you'd like us to know about this update."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition w-full sm:w-auto"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="ml-2">{saving ? "Saving..." : "Submit Changes"}</span>
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving || !bookingId}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="ml-2">Cancel Booking</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg text-sm border bg-gray-50 text-gray-800">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModifyBookingsPage;
