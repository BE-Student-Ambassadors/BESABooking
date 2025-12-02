import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle,
  Calendar,
  Clock,
  Users,
  MapPin,
  Mail,
  Phone,
  User,
  ArrowLeft,
  Download,
  Share2,
  ExternalLink,
} from "lucide-react";

interface BookingConfirmationData {
  id: string;
  tourTitle: string;
  date: string;
  time: string;
  duration: number;
  durationUnit: "minutes" | "hours";
  groupSize: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  location: string;
  zoomLink?: string;
  specialRequests?: string;
  accessibility?: string;
  calendarEventLink?: string;
  createdAt: string;
}

const BookingConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get booking data from navigation state
  const bookingData = location.state?.bookingData as BookingConfirmationData;
  
  // If no booking data, redirect to home
  if (!bookingData) {
    navigate("/");
    return null;
  }

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const generateCalendarFile = () => {
    const startDate = new Date(`${bookingData.date}T${convertTo24Hour(bookingData.time)}`);
    const endDate = new Date(startDate.getTime() + (bookingData.durationUnit === "hours" ? bookingData.duration * 60 : bookingData.duration) * 60000);
    
    const formatCalendarDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Campus Tours//EN",
      "BEGIN:VEVENT",
      `UID:${bookingData.id}@campustours.com`,
      `DTSTART:${formatCalendarDate(startDate)}`,
      `DTEND:${formatCalendarDate(endDate)}`,
      `SUMMARY:${bookingData.tourTitle} - Campus Tour`,
      `DESCRIPTION:Campus tour booking for ${bookingData.firstName} ${bookingData.lastName}\\nGroup size: ${bookingData.groupSize}\\nContact: ${bookingData.email}`,
      `LOCATION:${bookingData.location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campus-tour-${bookingData.date}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertTo24Hour = (time12h: string) => {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":");
    if (hours === "12") {
      hours = "00";
    }
    if (modifier === "PM") {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    return `${hours.padStart(2, "0")}:${minutes}:00`;
  };

  const shareBooking = async () => {
    const shareData = {
      title: `Campus Tour Booking Confirmed - ${bookingData.tourTitle}`,
      text: `I've booked a campus tour for ${formatDate(bookingData.date)} at ${bookingData.time}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback - copy to clipboard
      const shareText = `Campus Tour Booking Confirmed!\n\nTour: ${bookingData.tourTitle}\nDate: ${formatDate(bookingData.date)}\nTime: ${bookingData.time}\nGroup Size: ${bookingData.groupSize}`;
      navigator.clipboard.writeText(shareText);
      alert("Booking details copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed</h1>
            <div className="w-24" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Booking Confirmed!</h2>
            <p className="text-green-100 text-lg">
              Your campus tour has been successfully scheduled
            </p>
          </div>

          {/* Booking Details */}
          <div className="p-8">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button
                onClick={generateCalendarFile}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Add to Calendar
              </button>
              <button
                onClick={shareBooking}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share Details
              </button>
              {bookingData.calendarEventLink && (
                <a
                  href={bookingData.calendarEventLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View in Google Calendar
                </a>
              )}
            </div>

            {/* Tour Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-blue-900 mb-4">Tour Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Date</p>
                      <p className="text-gray-600">{formatDate(bookingData.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Time</p>
                      <p className="text-gray-600">
                        {bookingData.time} ({userTimeZone})
                      </p>
                      <p className="text-sm text-gray-500">
                        Duration: {bookingData.duration} {bookingData.durationUnit}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Group Size</p>
                      <p className="text-gray-600">{bookingData.groupSize} people</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Location</p>
                      <p className="text-gray-600">{bookingData.location}</p>
                      {bookingData.zoomLink && (
                        <a
                          href={bookingData.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Join Zoom Meeting
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Name</p>
                      <p className="text-gray-600">
                        {bookingData.firstName} {bookingData.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Email</p>
                      <p className="text-gray-600">{bookingData.email}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Phone</p>
                      <p className="text-gray-600">{bookingData.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Organization</p>
                      <p className="text-gray-600">{bookingData.organization}</p>
                      <p className="text-sm text-gray-500 capitalize">{bookingData.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            {(bookingData.specialRequests || bookingData.accessibility) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">Special Notes</h3>
                {bookingData.accessibility && (
                  <div className="mb-3">
                    <p className="font-medium text-yellow-800">Accessibility Requirements:</p>
                    <p className="text-yellow-700">{bookingData.accessibility}</p>
                  </div>
                )}
                {bookingData.specialRequests && (
                  <div>
                    <p className="font-medium text-yellow-800">Special Requests:</p>
                    <p className="text-yellow-700">{bookingData.specialRequests}</p>
                  </div>
                )}
              </div>
            )}

            {/* Booking Reference */}
            <div className="bg-gray-100 rounded-lg p-4 mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Booking Reference</p>
                  <p className="font-mono text-lg font-semibold text-gray-900">
                    #{bookingData.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Booked on</p>
                  <p className="text-gray-900">
                    {new Date(bookingData.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="border-t pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">What's Next?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Confirmation Email</p>
                    <p className="text-gray-600">
                      You'll receive a confirmation email at {bookingData.email} with all tour details
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Instructions</p>
                    <p className="text-gray-600">
                      <button
                        onClick={() => navigate("/parking-instructions")}
                        className="text-blue-600 hover:underline"
                      >
                        Click here for parking instructions and tour preparation guide.
                      </button>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Questions?</p>
                    <p className="text-gray-600">
                      Contact us at{" "}
                      <a
                        href="mailto:ucscbesa@ucsc.edu"
                        className="text-blue-600 hover:underline"
                      >
                        ucscbesa@ucsc.edu
                      </a>{" "}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t">
              <button
                onClick={() => navigate("/")}
                className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Home
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex-1 sm:flex-none px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Book Another Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;