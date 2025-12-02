import { useState, useEffect } from 'react';
import { Users, Clock, Edit } from 'lucide-react';
import { Routes, Route, useNavigate } from 'react-router-dom';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../src/firebase.ts'; 

import DashboardLayout from './pages/admin/adminDash';
import DashboardView from './pages/admin/views/dashboard';
import ScheduleView from './pages/admin/views/schedule';
import ToursManagementView from './pages/admin/views/toursManagement';
import BESAManagementView from './pages/admin/views/BESAManagements';
import OfficeHoursView from './pages/admin/views/officeHoursView.tsx';
import DynamicBookingForm from './pages/DynamicBookingFlow.tsx';
import BookingConfirmationPage from './pages/BookingConfirmationPage.tsx';
import ParkingInstructionsPage from './pages/ParkingInstructionsPage.tsx';
import AdminPage from './pages/admin/adminLogin.tsx'; 

// Feedback Button Component
const FeedbackButton = () => {
  const handleFeedbackClick = () => {
    window.open('https://docs.google.com/forms/d/e/1FAIpQLSe9s1wtdLrSEOPOXNYieJKHECG8gSc76V8nEwpdhm5EGmETWg/viewform?usp=sharing&ouid=101709250725869391286', '_blank');
  };

  return (
    <button
      onClick={handleFeedbackClick}
      className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 z-50 flex items-center space-x-2"
      title="Share Feedback"
    >
      <Edit className="h-5 w-5" />
      <span className="text-sm font-medium">Feedback</span>
    </button>
  );
};

function App() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const navigate = useNavigate();
  const [logoClickCount, setLogoClickCount] = useState(0);

  {/* Fetch Tours */}
  useEffect(() => {
  const fetchTours = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "Tours"));
      const toursData: Tour[] = querySnapshot.docs.map((d) => {
        const data: any = d.data();
        return {
          tourId: d.id,
          title: data.title ?? "",
          description: data.description ?? "",
          duration: data.duration ?? 0,
          durationUnit: data.durationUnit ?? "minutes",
          maxAttendeesPerBooking: data.maxAttendees ?? 5,
          maxBookings: data.maxBookings ?? 3,
          startDate: data.startDate, 
          endDate: data.endDate, 
          location: data.location ?? "",
          zoomLink: data.zoomLink ?? "",
          autoGenerateZoom: data.autoGenerateZoom ?? false,
          weeklyHours: data.weeklyHours ?? {},
          dateSpecificBlockDays: data.dateSpecificBlockDays ?? [],
          dateSpecificDays: data.dateSpecificDays ?? [], 
          frequency: data.frequency ?? 1,
          frequencyUnit: data.frequencyUnit ?? "hours",
          registrationLimit: data.registrationLimit ?? 1,
          minNotice: data.minNotice ?? 0,
          minNoticeUnit: data.minNoticeUnit ?? "hours",
          maxNotice: data.maxNotice ?? 1,
          maxNoticeUnit: data.maxNoticeUnit ?? "days",
          bufferTime: data.bufferTime ?? 0,
          bufferUnit: data.bufferUnit ?? "minutes",
          cancellationPolicy: data.cancellationPolicy ?? "",
          reschedulingPolicy: data.reschedulingPolicy ?? "",
          intakeForm: data.intakeForm ?? {
            firstName: true,
            lastName: true,
            email: true,
            phone: false,
            attendeeCount: true,
            majorsInterested: false,
            customQuestions: [],
          },
          reminderEmails: data.reminderEmails ?? [],
          sessionInstructions: data.sessionInstructions ?? "",
          published: data.published ?? false,
          createdAt: data.createdAt ?? "",
          upcomingBookings: data.upcomingBookings ?? 0,
          totalBookings: data.totalBookings ?? 0,
        } as Tour;
      });
      setTours(toursData);
    } catch (error) {
      console.error("Error fetching tours:", error);
    }
  };
  fetchTours();
}, []);

  {/* Handle logo triple-click */}
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const newCount = logoClickCount + 1;

    if (newCount === 3) {
      setLogoClickCount(0);
      navigate('/admin'); // redirect to admin login page first
    } else {
      setLogoClickCount(newCount);
      setTimeout(() => setLogoClickCount(0), 1500); // reset if no triple click within 1.5s
    }
  };

  {/* MAIN HOMEPAGE */}
  const PublicBookingView = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b-4 border-orange-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <a href="/" onClick={handleLogoClick}>
                <img src="/BE_logo.png" alt="BESA logo" className="h-12 w-12 object-contain" />
              </a>
              <span className="text-2xl font-medium text-blue-900">BESA Tours</span>
            </div>
            <div className="flex items-center space-x-4">
            </div>
          </div>
        </div>
      </header>

      {/* Header Big Block Section */}
      <div className="bg-blue-900 text-white py-16 border-b-4 border-orange-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Baskin Engineering Tours
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Book a personalized tour of the Baskin Engineering Building led by our BESA guides
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:px-6 sm:items-center justify-center max-w-lg mx-auto px-4">
            <a href="#tour-options" className="flex-1 sm:flex-none">
              <button className="w-full bg-orange-400 text-white px-4 sm:px-6 md:px-8 py-3 rounded-lg font-semibold text-sm sm:text-base md:text-lg hover:bg-orange-500 transition-colors transform hover:scale-105">
                Book Your Tour Now
              </button>
            </a>
            
            <a href="/parking-instructions" className="flex-1 sm:flex-none">
              <button className="w-full bg-orange-400 text-white px-4 sm:px-6 md:px-8 py-3 rounded-lg font-semibold text-sm sm:text-base md:text-lg hover:bg-orange-500 transition-colors transform hover:scale-105">
                Parking Instructions
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* Tour Options */}
      <div id="tour-options" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose The Tour That Best Suits You!</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select from our variety of tour options designed to accommodate tour sizes and interests.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {tours
            .filter((tour) => tour.published)
            .map((tour) => (
              <div
                key={tour.tourId}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-b-4 border-orange-300"
              >
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{tour.title}</h3>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                      Available
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mb-4 text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{tour.duration} {tour.durationUnit}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Max {tour.maxAttendeesPerBooking}</span>
                    </div>
                  </div>
                  <div className="flex-grow flex flex-col justify-between">
                    <p className="text-gray-600 mb-6 max-h-32 overflow-y-auto">{tour.description}</p>
                    <button
                      onClick={() => navigate(`/booking/${tour.tourId}`)}
                      className="w-full bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-900 transition-colors font-medium"
                    >
                      Select This Tour
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Routes>
        <Route path="/" element={<PublicBookingView />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path='/admin/dashboard' element={<DashboardLayout><DashboardView /></DashboardLayout>} />
        <Route path='/admin/schedule' element={<DashboardLayout><ScheduleView /></DashboardLayout>} />
        <Route path='/admin/tours' element={<DashboardLayout><ToursManagementView /></DashboardLayout>} />
        <Route path='/admin/besas' element={<DashboardLayout><BESAManagementView /></DashboardLayout>} />
        <Route path='/admin/office-hours' element={<DashboardLayout><OfficeHoursView /></DashboardLayout>} />
        
        {/* Booking Routes */}
        <Route path="/booking/:tourId" element={<DynamicBookingForm/>}/>
        <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
        <Route path="/parking-instructions" element={<ParkingInstructionsPage />} />
      </Routes>
      
      {/* Feedback Button - appears on all pages */}
      <FeedbackButton />
    </>
  );
}

export default App;