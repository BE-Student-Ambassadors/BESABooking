import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../src/firebase.ts";
import { ArrowLeft, Calendar, Clock, Check, Search, Loader2, Trash2, Save } from "lucide-react";

type BookingDoc = {
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

  const resetState = () => {
    setBooking(null);
    setBookingId(null);
    setDate("");
    setTime("");
    setError(null);
    setTour(null);
  };

  const handleLookup = async () => {
    const input = refCode.trim();
    if (!input) return;
    setError(null);
    setLoading(true);
    resetState();
    try {
      const directRef = doc(collection(db, "Bookings"), input);
      const snap = await getDoc(directRef);

      if (!snap.exists()) {
        setError("No booking found for that ID. Please paste the full booking ID from your confirmation.");
        return;
      }

      const data = snap.data() as BookingDoc;
      setBookingId(snap.id);
      setBooking(data);
      setDate(data.date ?? "");
      setTime(data.time ?? data.startTime ?? "");

      // fetch associated tour for validation
      if (data.tourId) {
        try {
          const tourSnap = await getDoc(doc(db, "Tours", data.tourId as string));
          if (tourSnap.exists()) {
            setTour({ tourId: tourSnap.id, ...(tourSnap.data() as any) } as Tour);
          }
        } catch (e) {
          console.warn("Could not load tour for validation", e);
        }
      }
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

    const isDateBlocked = (dt: Date, t: Tour) => {
      const iso = dt.toISOString().split("T")[0];
      const blocked = (t.dateSpecificBlockDays || []).find(d => {
        const start = new Date(d.startDate + "T00:00:00");
        const end = new Date((d.endDate || d.startDate) + "T23:59:59");
        return dt >= start && dt <= end;
      });
      if (blocked?.unavailable) return true;
      if (blocked?.slots && blocked.slots.length) return false;
      return false;
    };

    const hasSlotForDateTime = (dt: Date, formatted: string, t: Tour) => {
      const weekday = dt.toLocaleDateString("en-US", { weekday: "long" });
      const minutes = toMinutes(formatted);
      if (minutes < 0) return false;

      // check date-specific slots first
      const override = (t.dateSpecificBlockDays || []).find(d => {
        const start = new Date(d.startDate + "T00:00:00");
        const end = new Date((d.endDate || d.startDate) + "T23:59:59");
        return dt >= start && dt <= end;
      });
      const slots = override?.slots?.length ? override.slots : t.weeklyHours?.[weekday] || [];
      if (!slots || slots.length === 0) return false;
      return slots.some(s => {
        const startM = toMinutes(s.start);
        const endM = toMinutes(s.end);
        return startM <= minutes && minutes <= endM;
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
      const bookingRef = doc(db, "Bookings", bookingId);
      await updateDoc(bookingRef, {
        date,
        time: formattedTime,
        startTime: formattedTime,
        updatedAt: new Date().toISOString(),
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
      await deleteDoc(doc(db, "Bookings", bookingId));
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
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Modify Booking</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-800">Booking Reference</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={refCode}
                onChange={(e) => setRefCode(e.target.value)}
                placeholder="Enter reference (document ID)"
                className="flex-1 rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleLookup}
                className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="ml-2">Lookup</span>
              </button>
            </div>
            <p className="text-xs text-gray-500">Use the reference from your confirmation page (e.g., the doc ID).</p>
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

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition w-full sm:w-auto"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="ml-2">{saving ? "Saving..." : "Save Changes"}</span>
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
