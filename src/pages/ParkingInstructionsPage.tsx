import React, { useState } from "react";
import {ArrowLeft, MapPin, Clock, Bus, Car, AlertTriangle, ExternalLink, Phone, DollarSign, Calendar, ChevronLeft, ChevronRight} from "lucide-react";

const ParkingInstructionsPage: React.FC = () => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  // Video data - replace VIDEO_ID_HERE with actual YouTube video IDs
  const videos = [
    {
      id: "t8Xj48EFkN0",
      title: "Driving from Base of Campus",
      description: "How to find Baskin Engineering: driving from the base of campus"
    },
    {
      id: "EOFBiGSrHzI", 
      title: "Parking and Public Transit",
      description: "How to find Baskin Engineering: parking and public transit"
    }
  ];

  const nextVideo = () => {
    setCurrentVideoIndex((prevIndex) => 
      prevIndex === videos.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevVideo = () => {
    setCurrentVideoIndex((prevIndex) => 
      prevIndex === 0 ? videos.length - 1 : prevIndex - 1
    );
  };

  const handleBackClick = () => {
    // Try to go back in history first
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback: try to navigate to a common home page
      // You can customize this URL based on your application structure
      window.location.href = '/';
      // Or if you're using React Router, you might want to use:
      // navigate('/') or history.push('/')
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg px-2 py-1"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Parking Instructions</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <Car className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">BE Tour Parking Guide</h2>
            <p className="text-blue-100 text-lg">
              Everything you need to know about parking for your Baskin Engineering tour
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Video Carousel Section */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Baskin Parking Videos</h3>
              
              <div className="relative">
                {/* Video Container */}
                <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${videos[currentVideoIndex].id}`}
                    title={videos[currentVideoIndex].title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                  
                  {/* Navigation Arrows */}
                  {videos.length > 1 && (
                    <>
                      <button
                        onClick={prevVideo}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                        aria-label="Previous video"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={nextVideo}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200"
                        aria-label="Next video"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </div>
                
                {/* Video Info */}
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-900">{videos[currentVideoIndex].title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{videos[currentVideoIndex].description}</p>
                  
                  {/* Video Indicators */}
                  {videos.length > 1 && (
                    <div className="flex justify-center mt-4 gap-2">
                      {videos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentVideoIndex(index)}
                          className={`w-3 h-3 rounded-full transition-all duration-200 ${
                            index === currentVideoIndex 
                              ? 'bg-blue-600' 
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                          aria-label={`Go to video ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Video Counter */}
                  {videos.length > 1 && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Video {currentVideoIndex + 1} of {videos.length}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-blue-900 mb-4">Quick Reference</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">1-Day Permit: $10.00</p>
                    <p className="text-sm text-gray-600">1-Night Permit: $5.00</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Kiosk Hours: 7am-1pm</p>
                    <p className="text-sm text-gray-600">TAPS Office: 7am-5pm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Event Parking: (831) 459-1097</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-5 h-5 text-gray-600" />
                  <div>
                    <a
                      href="https://taps.ucsc.edu/parking/visitor-parking.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Official Parking Info
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Bus Parking Section */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Bus className="w-6 h-6 text-orange-600" />
                <h3 className="text-xl font-bold text-orange-900">Bus Parking</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">Important:</p>
                      <p className="text-orange-800">
                        Alert your event coordinator if you plan to arrive by bus. Parking for large vehicles (buses, RVs, limos) is only available at Barn Theater lot at the base of campus.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-orange-900 mb-2">Drop-off Locations:</h4>
                  <ul className="space-y-2 text-orange-800">
                    <li className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-orange-600 mt-0.5" />
                      Cowell College loading zone
                    </li>
                    <li className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-orange-600 mt-0.5" />
                      Rachel Carson College (formerly College Eight) loading zone
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                  <p className="text-yellow-800">
                    <strong>3-minute time limit</strong> at drop-off areas due to two transit systems using campus bus stops. Multiple buses must stagger arrivals and pickups.
                  </p>
                </div>

                <div>
                  <p className="text-orange-800">
                    If Barn Theater lot is full, call{" "}
                    <a href="tel:8314591097" className="font-semibold text-blue-600 hover:underline">
                      (831) 459-1097
                    </a>{" "}
                    to speak with TAPS Event Parking for guidance.
                  </p>
                </div>

                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                  <p className="text-orange-800">
                    A map showing loading zone locations and off-campus waiting areas is available for download from the{" "}
                    <a  href="https://transportation.ucsc.edu/parking/special-events/#tour-bus"
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="font-semibold text-orange-900 hover:underline">
                      TAPS website.
                    </a>{" "}
                  </p>
                </div>
              </div>
            </div>

            {/* Visitor Parking Section */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Car className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-bold text-green-900">Visitor Parking</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-green-900 mb-3">Where to Purchase Permits:</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-green-100 rounded-lg p-4">
                      <h5 className="font-semibold text-green-900 mb-2">Main Entrance Kiosk</h5>
                      <div className="space-y-1 text-green-800">
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Coolidge Drive
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          7:00am - 1:00pm
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Monday - Friday
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-green-100 rounded-lg p-4">
                      <h5 className="font-semibold text-green-900 mb-2">TAPS Sales Office</h5>
                      <div className="space-y-1 text-green-800">
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          H Barn
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          1:00pm - 5:00pm (also 7am-1pm)
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Monday - Friday
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-green-900 mb-2">Permit Costs:</h4>
                  <div className="bg-green-100 rounded-lg p-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">1-Day Permit</p>
                          <p className="text-2xl font-bold text-green-700">$10.00</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">1-Night Permit</p>
                          <p className="text-2xl font-bold text-green-700">$5.00</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-green-900 mb-2">Multi-Day Permits:</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800">
                      For permits lasting 2-7 consecutive days, visit the TAPS Sales Office in H Barn. 
                      <strong> Picture ID and proof of registration are required</strong> at the time of purchase.
                    </p>
                    <p className="text-blue-800 mt-2">
                      Sales Office hours: 7:00am to 5:00pm, Monday through Friday.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-green-900 mb-2">Planning Ahead:</h4>
                  <p className="text-green-800">
                    If you know the specific campus location you plan to visit, send an email inquiry in advance 
                    to obtain more information about guest and visitor parking availability for that specific area.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Resources */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Additional Resources</h3>
              <div className="space-y-3">
                <a
                  href="https://transportation.ucsc.edu/parking/parking-permits/visitor-guest-parking/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Official TAPS Visitor Parking Information
                </a>
                <p className="text-gray-600">
                  Maps showing bus loading zones and parking locations are available for download on the TAPS website.
                </p>
                <p className="text-gray-600">
                  <strong>Note:</strong> Maps should be checked carefully for accuracy and current information.
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-blue-900 mb-4">Need Help?</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">For Bus Parking Issues:</h4>
                  <p className="text-blue-800">
                    Call TAPS Event Parking at{" "}
                    <a href="tel:8314591097" className="font-semibold text-blue-600 hover:underline">
                      (831) 459-1097
                    </a>
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">General Tour Questions:</h4>
                  <p className="text-blue-800">
                    Contact us at{" "}
                    <a
                      href="mailto:ucscbesa@ucsc.edu"
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      ucscbesa@ucsc.edu
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t">
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 sm:flex-none px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParkingInstructionsPage;