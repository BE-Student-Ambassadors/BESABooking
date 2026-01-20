import { Edit } from 'lucide-react';
import { Routes, Route } from 'react-router-dom';

import DashboardLayout from './pages/admin/adminDash';
import DashboardView from './pages/admin/views/dashboard';
import ScheduleView from './pages/admin/views/schedule';
import ToursManagementView from './pages/admin/views/toursManagement';
import BESAManagementView from './pages/admin/views/BESAManagements';
import OfficeHoursView from './pages/admin/views/officeHoursView.tsx';
import SettingsView from './pages/admin/views/settings';
import AdminPage from './pages/admin/adminLogin.tsx';
import UnderConstruction from './pages/UnderConstruction';

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
  return (
    <>
      <Routes>
        <Route path="/" element={<UnderConstruction />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path='/admin/dashboard' element={<DashboardLayout><DashboardView /></DashboardLayout>} />
        <Route path='/admin/schedule' element={<DashboardLayout><ScheduleView /></DashboardLayout>} />
        <Route path='/admin/tours' element={<DashboardLayout><ToursManagementView /></DashboardLayout>} />
        <Route path='/admin/besas' element={<DashboardLayout><BESAManagementView /></DashboardLayout>} />
        <Route path='/admin/office-hours' element={<DashboardLayout><OfficeHoursView /></DashboardLayout>} />
        <Route path='/admin/settings' element={<DashboardLayout><SettingsView /></DashboardLayout>} />

        {/* Public routes temporarily directed to under construction */}
        <Route path="/booking/:tourId" element={<UnderConstruction />} />
        <Route path="/booking-confirmation" element={<UnderConstruction />} />
        <Route path="/parking-instructions" element={<UnderConstruction />} />
        <Route path="*" element={<UnderConstruction />} />
      </Routes>
      
      {/* Feedback Button - appears on all pages */}
      <FeedbackButton />
    </>
  );
}

export default App;
