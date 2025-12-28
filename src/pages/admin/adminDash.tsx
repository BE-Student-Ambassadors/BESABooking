import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Menu, X, LogOut, MapPin, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

type UserRole = 'public' | 'admin';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

function NavItem({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'group relative flex items-center gap-2 px-1 py-2 whitespace-nowrap text-[13px] font-medium transition-colors',
        active ? 'text-blue-700' : 'text-black hover:text-gray-900',
        'after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:rounded-full after:bg-blue-600 after:origin-left after:transition-transform after:duration-200 after:content-[\"\"]',
        active ? 'after:scale-x-100' : 'after:scale-x-0 group-hover:after:scale-x-100',
      ].join(' ')}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={['h-4 w-4 shrink-0', active ? 'text-blue-700' : 'text-black group-hover:text-gray-900'].join(' ')} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps): JSX.Element {
  const [currentRole, setCurrentRole] = useState<UserRole>('public');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1000);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1000);
      if (window.innerWidth >= 1000) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    setCurrentRole('public');
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const path = location.pathname;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b-4 border-orange-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/BE_logo.png" className="h-8 w-8" alt="Baskin Engineering" />
              <span className="text-lg sm:text-xl font-bold text-black truncate">BESA Tours</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                {currentRole === 'admin' ? 'Admin' : 'BESA'}
              </span>
            </div>

            {isDesktop && (
              <div className="flex items-center gap-6">
                <NavItem label="Dashboard" icon={Calendar} active={path === '/admin/dashboard'} onClick={() => navigate('/admin/dashboard')} />
                <NavItem label="Schedule" icon={Clock} active={path === '/admin/schedule'} onClick={() => navigate('/admin/schedule')} />
                <NavItem label="Tours" icon={MapPin} active={path === '/admin/tours'} onClick={() => navigate('/admin/tours')} />
                <NavItem label="BESAs" icon={Users} active={path === '/admin/besas'} onClick={() => navigate('/admin/besas')} />
                <NavItem label="Office Hours" icon={Clock} active={path === '/admin/office-hours'} onClick={() => navigate('/admin/office-hours')} />
                <NavItem label="Settings" icon={Settings} active={path === '/admin/settings'} onClick={() => navigate('/admin/settings')} />

                <button
                  onClick={handleLogout}
                  className="group relative flex items-center gap-2 px-1 py-2 text-[13px] font-medium text-red-600 hover:text-red-800 transition-colors whitespace-nowrap"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">Logout</span>
                  <span className="absolute left-0 -bottom-1 h-[2px] w-full rounded-full bg-red-600 origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100" />
                </button>
              </div>
            )}

            {!isDesktop && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>

        {isMobileMenuOpen && !isDesktop && (
          <div className="bg-white border-t">
            <div className="px-4 py-2 space-y-1">
              <button
                onClick={() => {
                  navigate('/admin/dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-black hover:text-gray-900"
              >
                <Calendar className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => {
                  navigate('/admin/schedule');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-black hover:text-gray-900"
              >
                <Clock className="h-4 w-4" />
                <span>Schedule</span>
              </button>
              <button
                onClick={() => {
                  navigate('/admin/tours');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-black hover:text-gray-900"
              >
                <MapPin className="h-4 w-4" />
                <span>Tours</span>
              </button>
              <button
                onClick={() => {
                  navigate('/admin/settings');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-black hover:text-gray-900"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => {
                  navigate('/admin/besas');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-black hover:text-gray-900"
              >
                <Users className="h-4 w-4" />
                <span>BESAs</span>
              </button>
              <button
                onClick={() => {
                  navigate('/admin/office-hours');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-black hover:text-gray-900"
              >
                <Clock className="h-4 w-4" />
                <span>Office Hours</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-red-600 hover:text-red-800"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>
      {children}
    </div>
  );
}
