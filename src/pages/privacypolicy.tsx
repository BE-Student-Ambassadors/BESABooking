import { ArrowLeft, Shield, Eye, Lock, Users, FileText, Mail, Bold } from 'lucide-react';


import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
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
                        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
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
                                <Shield className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Your Privacy Matters</h2>
                                <p className="text-gray-600">Last updated: January 2025</p>
                            </div>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                            We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how our application (“we,” “our,” or “us”) collects, uses, and safeguards the information you provide when using our services.
                        </p>
                    </div>

                    {/* Information We Collect */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Eye className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-semibold text-gray-900">Information We Collect</h3>
                        </div>
                        <div className="space-y-4 text-gray-700">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Information you provide</h4>
                                <p>
                                    When you make a booking, we may collect your name, email, phone number, organization or school, role, and other booking details you voluntarily share (e.g., group size, preferences, accessibility needs).
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Automatically collected data</h4>
                                <p>
                                    We may collect basic technical information such as IP address, browser type, device, and usage statistics to help operate, secure, and improve our service.
                                </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Calendar data</h4>
                                <p>
                                    If you connect your Google Calendar, we may access event details needed to schedule bookings on your behalf. You can revoke access at any time in your Google Account settings.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* How We Use Information */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-semibold text-gray-900">How We Use Your Information</h3>
                        </div>
                        <div className="space-y-3 text-gray-700">
                            <p>We use your information to:</p>
                            <ul className="space-y-2 ml-4">
                                <li className="flex items-start gap-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                    <span>Create and manage bookings and event invitations.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                    <span>Send booking confirmations, reminders, updates, and administrative messages.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                    <span>Share event details with invited participants (such as BESAs or organizers).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                    <span>Operate, maintain, and improve our services and user experience.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Data Sharing & Security */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Lock className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-semibold text-gray-900">Data Sharing & Security</h3>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <p className="text-blue-900 mb-4">
                                We do not sell or rent your information. We may share necessary details with:
                            </p>
                            <div className="grid md:grid-cols-1 gap-2 text-sm text-blue-800">
                                <div className="space-y-1">
                                    <p>• <b>Event participants:</b> To confirm attendance and logistics.</p>
                                    <p>• <b>Service providers:</b> Such as Google Calendar, to schedule events.</p>
                                    <p>• <b>Legal reasons:</b> If required by law or to protect safety and security.</p>
                                </div>
                            </div>
                            <p className="text-blue-900 mt-4">
                                We implement reasonable technical and organizational measures to protect your information from unauthorized access, alteration, or disclosure; however, no system can be completely secure.
                            </p>
                        </div>
                    </div>

                    {/* Your Rights */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-semibold text-gray-900">Your Choices & Rights</h3>
                        </div>
                        <div className="space-y-3 text-gray-700">
                            <p>You have the right to:</p>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Access your personal information
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Correct inaccurate information
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Request deletion of your data
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Opt out of marketing communications
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Withdraw consent at any time
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        File a complaint with authorities
                                    </p>
                                </div>
                            </div>
                            <p className="text-gray-700">
                                You can also revoke our access to your Google data at any time via your Google Account permissions.
                            </p>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="border-t pt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Mail className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xl font-semibold text-gray-900">Contact Us</h3>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-6">
                            <p className="text-gray-700 mb-4">
                                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
                            </p>
                            <div className="space-y-2 text-sm text-gray-600">
                                <p><span className="font-medium">Email:</span> ucscbesa@besa.edu</p>
                                <p><span className="font-medium">Phone:</span> (831) 459-5840</p>
                                <p><span className="font-medium">Address:</span> Baskin Engineering, 606 Engineering Loop, Santa Cruz, CA 95064</p>
                            </div>
                        </div>
                    </div>

                    {/* Updates */}
                    <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                            <span className="font-medium">Policy Updates:</span> We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through our website. Your continued use of our services after such modifications constitutes acceptance of the updated Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default PrivacyPolicy;