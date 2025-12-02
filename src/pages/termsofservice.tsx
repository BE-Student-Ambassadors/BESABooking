import {
    ArrowLeft,
    FileText,
    Scale,
    AlertTriangle,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfServicePage = () => {
    const navigate = useNavigate();
    function handleBack() {
        navigate("/");
    }
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Home
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Terms of Service
                        </h1>
                        <div className="w-24" />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    {/* Introduction */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Terms of Service
                                </h2>
                                <p className="text-gray-600">Effective Date: January 1, 2025</p>
                            </div>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                            These Terms of Service (“Terms”) govern your use of the BESA Tour Booking application (“Service”). By accessing or using the Service, you agree to these Terms and our Privacy Policy. If you do not agree, please do not use the Service.
                        </p>
                    </div>

                    {/* Acceptance of Terms */}
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                            Acceptance of Terms
                        </h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-900 text-sm">
                                By using the Service, you confirm that you are at least 13 years old (or the age of consent in your region), have read and accept these Terms, and will comply with all applicable laws and policies.
                            </p>
                        </div>
                    </div>

                    {/* Booking Terms */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Scale className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-semibold text-gray-900">
                                Bookings & Cancellations
                            </h3>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3">
                                    Creating a Booking
                                </h4>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li>• Provide accurate details (name, contact info, group size, preferences).</li>
                                    <li>• Bookings are subject to availability and may require advance notice.</li>
                                    <li>• Special accommodations should be requested in advance.</li>
                                </ul>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3">
                                    Attendance & Conduct
                                </h4>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li>• Arrive on time and follow guide instructions and campus policies.</li>
                                    <li>• Minors must be accompanied by a responsible adult.</li>
                                    <li>• Respect facilities and do not disrupt classes or activities.</li>
                                </ul>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3">
                                    Changes & Cancellation
                                </h4>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li>• You may request to reschedule or cancel subject to availability.</li>
                                    <li>• We may modify or cancel bookings for safety, operational, or emergency reasons.</li>
                                    <li>• No-shows may be restricted from future bookings.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* User Responsibilities */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Scale className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-semibold text-gray-900">
                                User Responsibilities
                            </h3>
                        </div>
                        <div className="space-y-3 text-gray-700">
                            <p>When using the Service, you agree to:</p>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm">Provide accurate and up-to-date information.</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm">Use the Service lawfully and respectfully.</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm">Comply with campus and safety guidelines.</span>
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="flex items-start gap-2">
                                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm">Not misuse, disrupt, or attempt to interfere with the Service.</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm">Not submit false bookings or use the Service fraudulently.</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm">Not share access credentials or others’ personal data without consent.</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Google Calendar / Integrations */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-semibold text-gray-900">
                                Calendar & Third-Party Services
                            </h3>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-700 text-sm">
                                If you connect Google Calendar or other services, you authorize us to create and manage events you request. You may revoke access at any time through your account with that provider. Use of third-party services is also governed by their own terms and policies.
                            </p>
                        </div>
                    </div>

                    {/* Liability & Disclaimers */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <h3 className="text-xl font-semibold text-gray-900">
                                Disclaimers & Limitation of Liability
                            </h3>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                            <div className="space-y-4 text-orange-900">
                                <div>
                                    <h4 className="font-medium mb-2">Service Availability</h4>
                                    <p className="text-sm">
                                        We strive for reliable service but do not guarantee uninterrupted or error-free operation. Events may be adjusted or cancelled due to factors beyond our control.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Limitation</h4>
                                    <p className="text-sm">
                                        To the maximum extent permitted by law, the Service is provided “as is” and we are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Safety</h4>
                                    <p className="text-sm">
                                        Tours may involve walking, stairs, uneven surfaces, or outdoor conditions. Participate safely and inform us of accessibility needs in advance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Intellectual Property */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-semibold text-gray-900">
                                Intellectual Property
                            </h3>
                        </div>
                        <div className="space-y-3 text-gray-700">
                            <p>
                                The Service and its content (design, text, images, software, and materials) are owned by or licensed to us. You may not copy, modify, distribute, or create derivative works without prior written permission.
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <ul className="space-y-1 text-sm">
                                    <li>• Website design, layout, and functionality</li>
                                    <li>• Text, images, logos, and multimedia content</li>
                                    <li>• Software, databases, and technical systems</li>
                                    <li>• Tour materials and educational content</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Privacy & Data */}
                    <div className="mb-8">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <h4 className="font-medium text-blue-900 mb-2">
                                Privacy & Data Protection
                            </h4>
                            <p className="text-blue-800 text-sm">
                                Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information. By using the Service, you consent to those practices.
                            </p>
                        </div>
                    </div>

                    {/* Modifications */}
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                            Changes to These Terms
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-700 text-sm">
                                We may update these Terms from time to time. Material changes will be posted on this page or communicated through the Service. Your continued use after changes means you accept the updated Terms.
                            </p>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="border-t pt-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                            Questions & Contact
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-6">
                            <p className="text-gray-700 mb-4">
                                If you have questions about these Terms or need assistance, please contact us:
                            </p>
                            <div className="space-y-2 text-sm text-gray-600">
                                <p><span className="font-medium">Email:</span> ucsc@besa.edu</p>
                                <p><span className="font-medium">Phone:</span> (831) 459-5840</p>
                                <p><span className="font-medium">Office Hours:</span> Monday–Friday, 8:00 AM–5:00 PM</p>
                                <p><span className="font-medium">Address:</span> Baskin Engineering, 606 Engineering Loop, Santa Cruz, CA 95064</p>
                            </div>
                        </div>
                    </div>

                    {/* Effective Date */}
                    <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                        <p className="text-gray-600 text-sm text-center">
                            These Terms of Service are effective as of January 1, 2025, and govern your use of the BESA Tour Booking application.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TermsOfServicePage;
