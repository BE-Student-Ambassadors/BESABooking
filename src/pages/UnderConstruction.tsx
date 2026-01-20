import React from "react";
import { Hammer, Mail, AlertTriangle, ArrowLeft } from "lucide-react";

const UnderConstruction: React.FC = () => {
  const email = "ucscbesa@ucsc.edu";

  const handleBackClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50">
      <header className="bg-white/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <span className="text-sm text-gray-500">We&apos;ll be live shortly</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
              <Hammer className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold">Page Under Construction</h1>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 mt-1" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Thank you for your patience.</h2>
                <p className="text-gray-600 mt-1">
                  This page is currently undergoing repairs, but we plan to have it back up very soon. If you
                  have an urgent request, we&apos;d love to help you directly.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-inner">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Urgent requests</p>
                  <a
                    href={`mailto:${email}`}
                    className="text-lg font-semibold text-blue-900 hover:text-blue-700 transition-colors"
                  >
                    {email}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UnderConstruction;
