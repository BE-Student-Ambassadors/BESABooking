import { useState, useEffect } from 'react';
import { Users, Clock, Edit, ArrowRight } from 'lucide-react';
import { Routes, Route, useNavigate } from 'react-router-dom';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../src/firebase.ts'; 

import DashboardLayout from './pages/admin/adminDash';
import DashboardView from './pages/admin/views/dashboard';
import ScheduleView from './pages/admin/views/schedule';
import ToursManagementView from './pages/admin/views/toursManagement';
import BESAManagementView from './pages/admin/views/BESAManagements';
import OfficeHoursView from './pages/admin/views/officeHoursView.tsx';
import SettingsView from './pages/admin/views/settings';
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
      className="fixed bottom-6 right-6 text-white px-5 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 z-50 flex items-center space-x-2 group"
      style={{ backgroundColor: '#003c6c' }}
      title="Share Feedback"
    >
      <Edit className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
      <span className="text-sm font-semibold">Feedback</span>
    </button>
  );
};

function App() {
  const [tours, setTours] = useState<Tour[]>([]);
  const navigate = useNavigate();

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

  const handleAdminClick = () => {
    navigate('/admin');
  };

  {/* MAIN HOMEPAGE */}
  const PublicBookingView = () => (
    <div className="min-h-screen" style={{ backgroundColor: '#d0d0ce' }}>
      {/* Top Header with glassmorphism */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b shadow-sm" style={{ borderBottomColor: '#75787b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 group">
              <a href="https://engineering.ucsc.edu/besa/" className="flex items-center space-x-3">
                <div className="relative">
                  <img 
                    src="/BE_logo.png" 
                    alt="BESA logo" 
                    className="h-14 w-14 object-contain transition-transform duration-300 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 rounded-full blur-xl transition-opacity duration-300" style={{ backgroundColor: '#f29813' }}></div>
                </div>
                <span className="text-2xl font-bold" style={{ color: '#003c6c' }}>
                  BESA Tours
                </span>
              </a>
            </div>
            <button
              onClick={handleAdminClick}
              className="text-white px-4 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-300"
              style={{ backgroundColor: '#003c6c' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#13a5dc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#003c6c'}
            >
              Admin Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with BE colors */}
      <div className="relative overflow-hidden" style={{ backgroundColor: '#003c6c' }}>
        {/* Animated background elements - using only BE colors */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(242, 152, 19, 0.15)' }}></div>
          <div className="absolute top-60 -left-40 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(19, 165, 220, 0.15)', animationDelay: '700ms' }}></div>
          <div className="absolute bottom-20 right-1/3 w-64 h-64 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: 'rgba(253, 199, 0, 0.1)', animationDelay: '1400ms' }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight text-white">
            Baskin Engineering Tours
          </h1>
          
          <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed text-white opacity-95">
            Discover cutting-edge facilities and innovative programs with personalized tours led by our expert BESA guides
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center max-w-lg mx-auto px-4">
            <a href="#tour-options" className="flex-1 sm:flex-none w-full sm:w-auto group">
              <button className="w-full text-white px-8 py-4 rounded-xl font-bold text-base md:text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center space-x-2 shadow-lg" style={{ backgroundColor: '#f29813' }}>
                <span>Book Your Tour</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </a>
            
            <a href="/parking-instructions" className="flex-1 sm:flex-none w-full sm:w-auto group">
              <button className="w-full text-white px-8 py-4 rounded-xl font-bold text-base md:text-lg transition-all duration-300 transform hover:scale-105" style={{ backgroundColor: '#13a5dc' }}>
                Parking Info
              </button>
            </a>
          </div>
        </div>
        
        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" fill="#d0d0ce" fillOpacity="1"></path>
          </svg>
        </div>
      </div>

      {/* Tour Options Section */}
      <div id="tour-options" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6" style={{ color: '#003c6c' }}>
            Choose Your Specialized Tour
          </h2>
          <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: '#75787b' }}>
            Select from our variety of tour options designed to accommodate different group sizes and interests
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tours
            .filter((tour) => tour.published)
            .map((tour, index) => (
              <div
                key={tour.tourId}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 overflow-hidden"
                style={{
                  animationDelay: `${index * 100}ms`,
                  border: '1px solid #d0d0ce'
                }}
              >
                {/* Card colored top border using BE colors */}
                <div className="h-2 flex">
                  <div className="flex-1" style={{ backgroundColor: '#f29813' }}></div>
                </div>
                
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <h3 className="text-2xl font-bold" style={{ color: '#003c6c' }}>
                      {tour.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="flex items-center space-x-2" style={{ color: '#75787b' }}>
                      <div className="p-2 rounded-lg transition-colors duration-300" style={{ backgroundColor: 'rgba(19, 165, 220, 0.1)' }}>
                        <Clock className="h-5 w-5" style={{ color: '#13a5dc' }} />
                      </div>
                      <span className="text-sm font-semibold">{tour.duration} {tour.durationUnit}</span>
                    </div>
                    <div className="flex items-center space-x-2" style={{ color: '#75787b' }}>
                      <div className="p-2 rounded-lg transition-colors duration-300" style={{ backgroundColor: 'rgba(0, 60, 108, 0.1)' }}>
                        <Users className="h-5 w-5" style={{ color: '#003c6c' }} />
                      </div>
                      <span className="text-sm font-semibold">Max {tour.maxAttendeesPerBooking}</span>
                    </div>
                  </div>
                  
                  <p className="mb-8 leading-relaxed line-clamp-4" style={{ color: '#75787b' }}>
                    {tour.description}
                  </p>
                  
                  <button
                    onClick={() => navigate(`/booking/${tour.tourId}`)}
                    className="w-full text-white py-3.5 px-6 rounded-xl transition-all duration-300 font-bold transform hover:scale-105 shadow-md hover:shadow-xl flex items-center justify-center space-x-2"
                    style={{ backgroundColor: '#003c6c' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#13a5dc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#003c6c'}
                  >
                    <span>Select This Tour</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
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
        <Route path='/admin/settings' element={<DashboardLayout><SettingsView /></DashboardLayout>} />
        
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
