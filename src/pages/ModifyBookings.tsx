import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Loader2, Trash2 } from "lucide-react";
import api from "../api.ts";
import { DynamicBookingForm } from "./DynamicBookingFlow.tsx";

export type BookingDoc = {
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
  attendees: number;
  organization: string;
  role: string;
  interests: string[]
  timeSlot: string;
  groupSize: number;
  leadGuide: string;
  notes: string;
  besas: {
        name: string;
        email: string;
    }[];
  accommodations: string;
  largeTourDetails: string;
};

const ModifyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [refCode, setRefCode] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [reason, setReason] = useState("");
  const [lastName, setLastName] = useState("");

  const resetState = () => {
    setBooking(null);
    setBookingId(null);
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
    setSaveSuccessMessage(null);
    setLoading(true);
    resetState();
    try {
      const response = await (await api.get("/api/bookings/lookup", {
        params: { id: idInput, lastName: lastInput },
      })).data;
      const message = typeof response?.message === "string" ? response.message : "";

      if (!response || typeof response !== "object") {
        console.error("Unexpected lookup response:", response);
        setError("The booking service returned an unexpected response. Please try again.");
        return;
      }

      if (!response.query) {
        setError(message || "No booking was found for that name or confirmation number.");
        return;
      }

      const data = response.query;
      if (!data.booking || !data.tour) {
        setError("The booking record is incomplete. Please try again or contact an administrator.");
        return;
      }
      const booking = data.booking as BookingDoc;
      setTour({ ...data.tour as Tour });
      setBookingId(data.booking_id || null);
      setBooking(booking);

    } catch (err) {
      console.error("Lookup error:", err);
      setError("Could not fetch booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updates: Partial<BookingDoc>) => {
    if (!bookingId) {
      setError("Please look up a booking first.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveSuccessMessage(null);

    try {
      const response = await api.patch(`/api/bookings/${bookingId}/reschedule`, {
        ...updates,
        modificationReason: reason,
        updatedAt: new Date().toISOString(),
      });

      if (!response.data?.payload) {
        setError(response.data?.message || "Failed to save changes. Please try again.");
        return;
      }

      setBooking((current) => current ? ({
        ...current,
        bookingId,
        ...updates,
      } as BookingDoc) : current);
      setSaveSuccessMessage("Changes saved. Your booking has been updated.");
    } catch (err) {
      console.error("Save error:", err);
      setError((err as any)?.response?.data?.message || "Failed to save changes. Please try again.");
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

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleLookup();
            }}
          >
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
                type="submit"
                className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="ml-2">Lookup</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="p-3 rounded-lg text-sm border bg-gray-50 text-gray-800">
              {error}
            </div>
          )}
        </div>

        {(booking && tour) && (
          <div className="space-y-4">
            <DynamicBookingForm
              tours={[tour]}
              preselectedTour={tour.tourId || booking.tourId || ""}
              navigate={navigate}
              preselectedBooking={booking}
              onSubmit={handleSave}
              mode="reschedule"
              successMessage={saveSuccessMessage}
            />

            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
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
                  onClick={handleCancel}
                  disabled={saving || !bookingId}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="ml-2">Cancel Booking</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModifyBookingsPage;
