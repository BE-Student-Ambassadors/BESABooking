import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Menu, X, LogOut, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

{/* Add mobile/window minimizing version */}

type UserRole = 'public' | 'admin';

interface DashboardLayoutProps {
    children?: React.ReactNode;
}

export default function dashboardLayout({children}: DashboardLayoutProps): JSX.Element {

    const [currentRole, setCurrentRole] = useState<UserRole>('public');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1000);
    const navigate = useNavigate();

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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* HEADER */}
            <nav className="bg-white shadow-sm border-b-4 border-orange-400">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <img src="/BE_logo.png" className="h-8 w-8 text-blue-600" />
                            <span className="text-xl font-bold text-gray-900">BESA Tours</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium ml-2">
                                {currentRole === 'admin' ? 'Admin' : 'BESA'}
                            </span>
                        </div>

                        {/* DASHBOARD HEADER BUTTON */}
                        {isDesktop && (
                            <div className="flex items-center space-x-6">
                                <button onClick={() => navigate('/admin/dashboard')}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${window.location.pathname === '/admin/dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                                        }`}>
                                    <Calendar className="h-4 w-4" />
                                    <span>Dashboard</span>
                                </button>

                                {/* SCHEDULE HEADER BUTTON */}
                                <button onClick={() => navigate('/admin/schedule')}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${window.location.pathname === '/admin/schedule' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                                        }`}>
                                    <Clock className="h-4 w-4" />
                                    <span>Schedule</span>
                                </button>

                                {/* TOURS HEADER BUTTON */}
                                <button onClick={() => navigate('/admin/tours')}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${window.location.pathname === '/admin/tours' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                                        }`}>
                                    <MapPin className="h-4 w-4" />
                                    <span>Tours</span>
                                </button>

                                {/* BESAs HEADER BUTTON */}
                                <button onClick={() => navigate('/admin/besas')}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${window.location.pathname === '/admin/besas' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                                        }`}>
                                    <Users className="h-4 w-4" />
                                    <span>BESAs</span>
                                </button>

                                {/* OFFICE HOURS HEADER BUTTON */}
                                <button onClick={() => navigate('/admin/office-hours')}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${window.location.pathname === '/admin/office-hours' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                                        }`}>
                                    <Clock className="h-4 w-4" />
                                    <span>Office Hours</span>
                                </button>

                                <button onClick={handleLogout}
                                    className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-800 transition-colors">
                                    <LogOut className="h-4 w-4" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}

                        {!isDesktop && (
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 rounded-lg text-gray-600 hover:text-gray-900">
                                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && !isDesktop && (
                    <div className="bg-white border-t">
                        <div className="px-4 py-2 space-y-1">
                            <button
                                onClick={() => { navigate('/admin/dashboard'); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-gray-600 hover:text-gray-900"
                            >
                                <Calendar className="h-4 w-4" />
                                <span>Dashboard</span>
                            </button>
                            <button
                                onClick={() => { navigate('/admin/schedule'); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-gray-600 hover:text-gray-900"
                            >
                                <Clock className="h-4 w-4" />
                                <span>Schedule</span>
                            </button>
                            <button
                                onClick={() => { navigate('/admin/tours'); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-gray-600 hover:text-gray-900"
                            >
                                <MapPin className="h-4 w-4" />
                                <span>Tours</span>
                            </button>
                            <button
                                onClick={() => { navigate('/admin/besas'); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-gray-600 hover:text-gray-900"
                            >
                                <Users className="h-4 w-4" />
                                <span>BESAs</span>
                            </button>
                            <button
                                onClick={() => { navigate('/admin/office-hours'); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left text-gray-600 hover:text-gray-900"
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
