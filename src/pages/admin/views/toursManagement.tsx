import { useState, useEffect, useMemo, Dispatch, SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Calendar, Clock, MapPin, Users, Settings, FileText, CheckCircle,Plus,X,Globe,Video,AlertCircle,Edit3,Trash2,Eye} from 'lucide-react';
import { db } from "../../../../src/firebase.ts";
import { collection, onSnapshot, deleteDoc, doc, updateDoc, addDoc } from "firebase/firestore";
import { tourBannerOptions } from "../../../data/tourBannerOptions";

{/* Create/Edit Tour Button adaptable for small screen */}
{/* Allow to move order of tours (group first, etc) */}
{/* Have it show the dates range instead of days in the front */}
{/* Availabilty: allow for holiday dates */}


const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMPTY_WEEKLY_HOURS = DAYS_OF_WEEK.reduce<WeeklyHours>((acc, day) => {
  acc[day] = [];
  return acc;
}, {});
const createDefaultAvailabilityRange = (): AvailabilityRange => ({
  startDate: '',
  endDate: '',
  weeklyHours: { ...EMPTY_WEEKLY_HOURS },
});
const normalizeWeeklyHours = (weeklyHours?: WeeklyHours): WeeklyHours =>
  DAYS_OF_WEEK.reduce<WeeklyHours>((acc, day) => {
    acc[day] = [...(weeklyHours?.[day] || [])];
    return acc;
  }, {});
const normalizeAvailabilityRanges = (tour?: Tour): AvailabilityRange[] => {
  if (tour?.availabilityRanges?.length) {
    return tour.availabilityRanges.map((range) => ({
      startDate: range.startDate || '',
      endDate: range.endDate || '',
      weeklyHours: normalizeWeeklyHours(range.weeklyHours),
    }));
  }

  if (
    tour?.startDate ||
    tour?.endDate ||
    DAYS_OF_WEEK.some((day) => (tour?.weeklyHours?.[day] || []).length > 0)
  ) {
    return [{
      startDate: tour?.startDate || '',
      endDate: tour?.endDate || '',
      weeklyHours: normalizeWeeklyHours(tour?.weeklyHours),
    }];
  }

  return [createDefaultAvailabilityRange()];
};

function TourFormPage({ onBack, editingTour }: { onBack: () => void; editingTour?: Tour; onSaveTour: (tour: Tour) => void;}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [tour, setTour] = useState<Tour>(editingTour || {
    tourId: '',
    title: '',
    description: '',
    duration: 60,
    durationUnit: 'minutes',
    maxAttendeesPerBooking: 5,
    bookingNotice: '',
    bannerImageUrl: '',
    maxBookings: 3,
    location: '',
    zoomLink: '',
    autoGenerateZoom: false,
    weeklyHours: {},
    availabilityRanges: [createDefaultAvailabilityRange()],
    googleCalendarId: '',
    dateSpecificBlockDays: [],
    dateSpecificDays: [],
    frequency: 60,
    frequencyUnit: 'minutes',
    minNotice: 24,
    minNoticeUnit: 'hours',
    maxNotice: 30,
    maxNoticeUnit: 'days',
    cancellationPolicy: '',
    reschedulingPolicy: '',
    intakeForm: {
      firstName: true,
      lastName: true,
      email: true,
      phone: false,
      attendeeCount: true,
      majorsInterested: false,
      largeTourDetailsEnabled: false,
      largeTourDetailsLabel: 'Please share details about your large in-person group (size, schedule needs, accessibility, etc.)',
      customQuestions: []
    },
    reminderEmails: [{ timing: 24, unit: 'hours' }],
    sessionInstructions: '',
    published: false
  });

  useEffect(() => {
    setTour((prev) => ({
      ...prev,
      availabilityRanges: normalizeAvailabilityRanges(prev),
    }));
  }, []);

  const isEditing = !!editingTour;

  const steps = [
    { number: 1, title: 'Basic Info', icon: FileText },
    { number: 2, title: 'Location', icon: MapPin },
    { number: 3, title: 'Availability', icon: Calendar },
    { number: 4, title: 'Scheduling Rules', icon: Settings },
    { number: 5, title: 'Review', icon: CheckCircle }
  ];

  const updateTour = (updates: Partial<Tour>) => {
    setTour(prev => ({ ...prev, ...updates }));
  };

  const updateAvailabilityRange = (rangeIndex: number, updates: Partial<AvailabilityRange>) => {
    const nextRanges = [...(tour.availabilityRanges || [])];
    const existing = nextRanges[rangeIndex] || createDefaultAvailabilityRange();
    nextRanges[rangeIndex] = {
      ...existing,
      ...updates,
      weeklyHours: normalizeWeeklyHours(updates.weeklyHours || existing.weeklyHours),
    };
    updateTour({ availabilityRanges: nextRanges });
  };

  const addAvailabilityRange = () => {
    updateTour({
      availabilityRanges: [...(tour.availabilityRanges || []), createDefaultAvailabilityRange()]
    });
  };

  const removeAvailabilityRange = (rangeIndex: number) => {
    const nextRanges = (tour.availabilityRanges || []).filter((_, index) => index !== rangeIndex);
    updateTour({
      availabilityRanges: nextRanges.length ? nextRanges : [createDefaultAvailabilityRange()]
    });
  };

  const addWeeklyTimeSlot = (rangeIndex: number, day: string) => {
    const newSlot = { start: '09:00', end: '17:00' };
    const range = (tour.availabilityRanges || [])[rangeIndex] || createDefaultAvailabilityRange();
    updateAvailabilityRange(rangeIndex, {
      weeklyHours: {
        ...range.weeklyHours,
        [day]: [...(range.weeklyHours[day] || []), newSlot]
      }
    });
  };

  const removeWeeklyTimeSlot = (rangeIndex: number, day: string, index: number) => {
    const range = (tour.availabilityRanges || [])[rangeIndex] || createDefaultAvailabilityRange();
    const daySlots = range.weeklyHours[day] || [];
    updateAvailabilityRange(rangeIndex, {
      weeklyHours: {
        ...range.weeklyHours,
        [day]: daySlots.filter((_, i) => i !== index)
      }
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return tour.title.trim() && tour.description.trim() && tour.duration > 0;
      case 2:
        return tour.location.trim() || tour.zoomLink.trim();
      default:
        return true;
    }
  };

  const formatTime12Hour = (time24: string) => {
    if (!time24 || !time24.includes(':')) return time24;
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = ((hours + 11) % 12) + 1;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const renderStepContent = () => {
  switch (currentStep) {
    case 1:
      return (
        <div className="space-y-4 2xl:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tour Title *</label>
            <input
              type="text"
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
              placeholder="e.g. Engineering Building Tour"
              value={tour.title}
              onChange={(e) => updateTour({ title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              rows={3}
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base resize-y"
              placeholder="Describe what visitors will see and experience during this tour..."
              value={tour.description}
              onChange={(e) => updateTour({ description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 2xl:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration *</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  className="flex-1 px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
                  value={tour.duration}
                  onChange={(e) => updateTour({ duration: parseInt(e.target.value) || 0 })}
                />
                <select
                  className="px-2 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs 2xl:text-base min-w-0"
                  value={tour.durationUnit}
                  onChange={(e) => updateTour({ durationUnit: e.target.value as 'minutes' | 'hours' })}
                >
                  <option value="minutes">Min</option>
                  <option value="hour">Hour</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Bookings Per Time Slot *</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
                value={tour.maxBookings}
                onChange={(e) => updateTour({ maxBookings: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 2xl:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Attendees Per Booking *</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
                value={tour.maxAttendeesPerBooking}
                onChange={(e) => updateTour({ maxAttendeesPerBooking: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Booking Notice</label>
            <textarea
              rows={3}
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base resize-y"
              placeholder="For example: One booking per person. If your party has multiple people, please make a separate booking for each person."
              value={tour.bookingNotice || ''}
              onChange={(e) => updateTour({ bookingNotice: e.target.value })}
            />
            <p className="mt-1 text-xs text-gray-500">Shown above the date calendar only when this tour is selected.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tour Banner</label>
            <select
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
              value={tourBannerOptions.some((option) => option.url === tour.bannerImageUrl) ? tour.bannerImageUrl : ''}
              onChange={(e) => updateTour({ bannerImageUrl: e.target.value })}
            >
              <option value="">Choose an image from the banner library</option>
              {tourBannerOptions.map((option) => (
                <option key={option.url} value={option.url}>{option.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Repository banners are stored in `public/tour-banners` and listed in `src/data/tourBannerOptions.ts`.</p>
            {tour.bannerImageUrl && (
              <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                <img src={tour.bannerImageUrl} alt="Tour banner preview" className="h-auto w-full" />
                <button
                  type="button"
                  onClick={() => updateTour({ bannerImageUrl: '' })}
                  className="m-3 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove banner
                </button>
              </div>
            )}
          </div>
        </div>
      );

    case 2:
      return (
        <div className="space-y-4 2xl:space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 2xl:p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 2xl:h-5 2xl:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs 2xl:text-sm text-blue-800">
                Tours can be in-person, virtual, or hybrid. At least one location option is required.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Physical Location
            </label>
            <input
              type="text"
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
              placeholder="e.g. Baskin Engineering Building, Room 101"
              value={tour.location}
              onChange={(e) => updateTour({ location: e.target.value })}
            />
          </div>

          <div className="border-t pt-4 2xl:pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Video className="inline h-4 w-4 mr-1" />
              Virtual Meeting Link
            </label>
            <input
              type="url"
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
              placeholder="https://zoom.us/j/..."
              value={tour.zoomLink}
              onChange={(e) => updateTour({ zoomLink: e.target.value, autoGenerateZoom: false })}
            />
          </div>
        </div>
      );

    case 3:
  return (
  <div className="space-y-6 2xl:space-y-8">

    {/* Availability Ranges */}
    <div>
      <div className="flex items-center justify-between mb-3 2xl:mb-4">
        <div>
          <h3 className="text-base 2xl:text-lg font-medium text-gray-900">Availability Ranges</h3>
          <p className="text-xs 2xl:text-sm text-gray-500 mt-1">
            Add date windows and set separate recurring hours for each one.
          </p>
        </div>
        <button
          type="button"
          onClick={addAvailabilityRange}
          className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center space-x-1"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Add Range</span>
        </button>
      </div>

      <div className="space-y-3 2xl:space-y-4">
        {(tour.availabilityRanges || []).map((range, rangeIndex) => (
          <div key={rangeIndex} className="border border-gray-200 rounded-lg p-3 2xl:p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={range.startDate || ''}
                    onChange={(e) => updateAvailabilityRange(rangeIndex, { startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={range.endDate || ''}
                    onChange={(e) => updateAvailabilityRange(rangeIndex, { endDate: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeAvailabilityRange(rangeIndex)}
                className="text-red-600 hover:bg-red-50 p-2 rounded-lg mt-6"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {range.startDate && range.endDate && new Date(range.startDate) > new Date(range.endDate) && (
              <p className="text-red-600 text-xs">End date must be after start date</p>
            )}

            <div className="space-y-3 2xl:space-y-4">
              {DAYS_OF_WEEK.map((day) => (
                <div key={`${rangeIndex}-${day}`} className="border border-gray-200 rounded-lg p-3 2xl:p-4">
                  <div className="flex items-center justify-between mb-2 2xl:mb-3">
                    <h4 className="text-sm 2xl:text-base font-medium text-gray-900">{day}</h4>
                    <button
                      type="button"
                      onClick={() => addWeeklyTimeSlot(rangeIndex, day)}
                      className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {(range.weeklyHours[day] || []).length === 0 && (
                    <p className="text-gray-500 text-xs 2xl:text-sm">No time slots set for this day</p>
                  )}

                  {(range.weeklyHours[day] || []).map((slot, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2 last:mb-0">
                      <input
                        type="time"
                        className="flex-1 px-2 2xl:px-3 py-1 2xl:py-2 border border-gray-300 rounded-lg text-xs 2xl:text-sm"
                        value={slot.start}
                        onChange={(e) => {
                          const newSlots = [...(range.weeklyHours[day] || [])];
                          newSlots[index] = { ...slot, start: e.target.value };
                          updateAvailabilityRange(rangeIndex, {
                            weeklyHours: { ...range.weeklyHours, [day]: newSlots }
                          });
                        }}
                      />
                      <span className="text-gray-500 text-xs 2xl:text-sm">to</span>
                      <input
                        type="time"
                        className="flex-1 px-2 2xl:px-3 py-1 2xl:py-2 border border-gray-300 rounded-lg text-xs 2xl:text-sm"
                        value={slot.end}
                        onChange={(e) => {
                          const newSlots = [...(range.weeklyHours[day] || [])];
                          newSlots[index] = { ...slot, end: e.target.value };
                          updateAvailabilityRange(rangeIndex, {
                            weeklyHours: { ...range.weeklyHours, [day]: newSlots }
                          });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeWeeklyTimeSlot(rangeIndex, day, index)}
                        className="text-red-600 hover:bg-red-50 p-1 rounded-lg flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Google Calendar Destination */}
    <div className="border-t pt-4 2xl:pt-6">
      <h3 className="text-base 2xl:text-lg font-medium text-gray-900 mb-3 2xl:mb-4">Google Calendar</h3>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 2xl:p-4">
        <label htmlFor="google-calendar-id" className="block text-sm font-medium text-gray-700 mb-2">
          Save bookings to
        </label>
        <input
          id="google-calendar-id"
          list="google-calendar-options"
          type="text"
          className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
          placeholder="primary or a Google Calendar ID"
          value={tour.googleCalendarId || ''}
          onChange={(e) => updateTour({ googleCalendarId: e.target.value.trim() })}
        />
        <datalist id="google-calendar-options">
          <option value="primary">Primary calendar</option>
        </datalist>
        <p className="text-xs text-gray-500 mt-2">
          Enter <code>primary</code> for the connected account's main calendar, or paste a calendar ID such as an email address.
        </p>
      </div>
    </div>

    {/* Tour Frequency */}
    <div className="border-t pt-4 2xl:pt-6">
      <h3 className="text-base 2xl:text-lg font-medium text-gray-900 mb-3 2xl:mb-4">Tour Frequency</h3>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 2xl:p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Start new tour every:
        </label>
        <div className="flex space-x-2">
          <input
            type="number"
            min="1"
            className="w-16 2xl:w-24 px-2 2xl:px-3 py-1 2xl:py-2 border border-gray-300 rounded-lg text-sm"
            value={tour.frequency}
            onChange={(e) => updateTour({ frequency: parseInt(e.target.value) || 1 })}
          />
          <select
            className="flex-1 px-2 2xl:px-3 py-1 2xl:py-2 border border-gray-300 rounded-lg text-xs 2xl:text-sm"
            value={tour.frequencyUnit}
            onChange={(e) => updateTour({ frequencyUnit: e.target.value as 'minutes' | 'hours' })}
          >
            <option value="minutes">Minutes</option>
            <option value="hour">Hour</option>
            <option value="hours">Hours</option>
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Based on tour duration of {tour.duration} {tour.durationUnit}
        </p>
      </div>
    </div>

    {/* Holidays & Special Events Block Off */}
    <div className="border-t pt-4 2xl:pt-6">
  <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3 2xl:gap-0 mb-3 2xl:mb-4">
    <div>
      <h3 className="text-base 2xl:text-lg font-medium text-gray-900">Holidays & Special Events</h3>
      <p className="text-xs 2xl:text-sm text-gray-500 mt-1">These blocked off dates apply to this tour only.</p>
    </div>
    <button
      type="button"
      onClick={() => {
        updateTour({
          dateSpecificBlockDays: [
            ...(tour.dateSpecificBlockDays || []),
            { startDate: '', endDate: '', slots: [], unavailable: true, appliesToAllTours: true }
          ]
        });
      }}
      className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center space-x-1 self-start"
    >
      <Plus className="h-4 w-4" />
      <span className="text-sm">Add Date Override</span>
    </button>
  </div>

  <div className="space-y-3 2xl:space-y-4">
    {(!tour.dateSpecificBlockDays || tour.dateSpecificBlockDays.length === 0) && (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-500">No date overrides set</p>
      </div>
    )}

    {(tour.dateSpecificBlockDays || []).map((dateOverride, index) => (
      <div key={index} className="border border-gray-200 rounded-lg p-3 2xl:p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={dateOverride.startDate}
              onChange={(e) => {
                const newDateSpecific = [...(tour.dateSpecificBlockDays || [])];
                newDateSpecific[index] = { ...dateOverride, startDate: e.target.value };
                updateTour({ dateSpecificBlockDays: newDateSpecific });
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              updateTour({
                dateSpecificBlockDays: (tour.dateSpecificBlockDays || []).filter((_, i) => i !== index)
              });
            }}
            className="text-red-600 hover:bg-red-50 p-2 rounded-lg mt-6"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
            type="checkbox"
            checked={dateOverride.unavailable}
            onChange={(e) => {
              const newDateSpecific = [...(tour.dateSpecificBlockDays || [])];
              newDateSpecific[index] = { 
                ...dateOverride, 
                unavailable: e.target.checked
              };
              updateTour({ dateSpecificBlockDays: newDateSpecific });
            }}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-gray-700">Entire day is unavailable (holiday/closed)</span>
        </label>

        <div className="mt-2 flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              const newDateSpecific = [...(tour.dateSpecificBlockDays || [])];
              newDateSpecific[index] = {
                ...dateOverride,
                appliesToAllTours: !(dateOverride.appliesToAllTours ?? true)
              };
              updateTour({ dateSpecificBlockDays: newDateSpecific });
            }}
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              dateOverride.appliesToAllTours
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {dateOverride.appliesToAllTours ? 'Universal: ON' : 'Universal: OFF'}
          </button>
          <span className="text-xs text-gray-600">Applies to all tours</span>
        </div>
      </div>

      {!dateOverride.unavailable && (
        <div>
          <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Custom Time Slots</label>
              <button
                type="button"
                onClick={() => {
                  const newDateSpecific = [...(tour.dateSpecificBlockDays || [])];
                  newDateSpecific[index] = {
                    ...dateOverride,
                    slots: [...dateOverride.slots, { start: '09:00', end: '17:00' }]
                  };
                  updateTour({ dateSpecificBlockDays: newDateSpecific });
                }}
                className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {dateOverride.slots.length === 0 && (
              <p className="text-gray-500 text-xs mb-2">No custom slots.</p>
            )}

            <div className="space-y-2">
              {dateOverride.slots.map((slot, slotIndex) => (
                <div key={slotIndex} className="flex items-center space-x-2">
                  <input
                    type="time"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                    value={slot.start}
                    onChange={(e) => {
                      const newDateSpecific = [...(tour.dateSpecificBlockDays || [])];
                      const newSlots = [...dateOverride.slots];
                      newSlots[slotIndex] = { ...slot, start: e.target.value };
                      newDateSpecific[index] = { ...dateOverride, slots: newSlots };
                      updateTour({ dateSpecificBlockDays: newDateSpecific });
                    }}
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="time"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                    value={slot.end}
                    onChange={(e) => {
                      const newDateSpecific = [...(tour.dateSpecificBlockDays || [])];
                      const newSlots = [...dateOverride.slots];
                      newSlots[slotIndex] = { ...slot, end: e.target.value };
                      newDateSpecific[index] = { ...dateOverride, slots: newSlots };
                      updateTour({ dateSpecificBlockDays: newDateSpecific });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newDateSpecific = [...(tour.dateSpecificBlockDays || [])];
                      newDateSpecific[index] = {
                        ...dateOverride,
                        slots: dateOverride.slots.filter((_, i) => i !== slotIndex)
                      };
                      updateTour({ dateSpecificBlockDays: newDateSpecific });
                    }}
                    className="text-red-600 hover:bg-red-50 p-1 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
</div>

  </div>
);


    case 4:
      return (
        <div className="space-y-4 2xl:space-y-6">
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 2xl:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Notice</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  className="flex-1 px-2 2xl:px-3 py-2 2xl:py-3 border border-gray-300 rounded-lg text-sm 2xl:text-base"
                  value={tour.minNotice}
                  onChange={(e) => updateTour({ minNotice: parseInt(e.target.value) || 1 })}
                />
                <select
                  className="px-2 2xl:px-3 py-2 2xl:py-3 border border-gray-300 rounded-lg text-xs 2xl:text-sm min-w-0"
                  value={tour.minNoticeUnit}
                  onChange={(e) => updateTour({ minNoticeUnit: e.target.value as any })}
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Notice</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  className="flex-1 px-2 2xl:px-3 py-2 2xl:py-3 border border-gray-300 rounded-lg text-sm 2xl:text-base"
                  value={tour.maxNotice}
                  onChange={(e) => updateTour({ maxNotice: parseInt(e.target.value) || 1 })}
                />
                <select
                  className="px-2 2xl:px-3 py-2 2xl:py-3 border border-gray-300 rounded-lg text-xs 2xl:text-sm min-w-0"
                  value={tour.maxNoticeUnit}
                  onChange={(e) => updateTour({ maxNoticeUnit: e.target.value as any })}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation Policy</label>
            <textarea
              rows={3}
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base resize-y"
              placeholder="e.g. To cancel or reschedule, please email us at least 24 hours in advance..."
              value={tour.cancellationPolicy}
              onChange={(e) => updateTour({ cancellationPolicy: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rescheduling Policy</label>
            <textarea
              rows={3}
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base resize-y"
              placeholder="e.g. Rescheduling must be requested at least 48 hours in advance..."
              value={tour.reschedulingPolicy}
              onChange={(e) => updateTour({ reschedulingPolicy: e.target.value })}
            />
          </div>
        </div>
      );

    case 5:
      return (
        <div className="space-y-4 2xl:space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 2xl:p-6 text-center">
            <CheckCircle className="h-10 w-10 2xl:h-12 2xl:w-12 text-green-600 mx-auto mb-3 2xl:mb-4" />
            <h3 className="text-base 2xl:text-lg font-medium text-gray-900 mb-2">Tour Setup Complete!</h3>
            <p className="text-sm 2xl:text-base text-gray-600">Review your tour details below and choose how to proceed.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 2xl:p-6">
            <h4 className="text-sm 2xl:text-base font-medium text-gray-900 mb-3 2xl:mb-4">Tour Summary</h4>
            
            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2 2xl:gap-4 text-xs 2xl:text-sm">
              <div>
                <span className="font-medium text-gray-700">Title:</span>
                <span className="ml-2 text-gray-900 break-words">{tour.title}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Duration:</span>
                <span className="ml-2 text-gray-900">{tour.duration} {tour.durationUnit}</span>
              </div>

              <div>
                <span className="font-medium text-gray-700">Max Attendees Per Session:</span>
                <span className="ml-2 text-gray-900">{tour.maxAttendeesPerBooking}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Max Bookings Per Session:</span>
                <span className="ml-2 text-gray-900">{tour.maxBookings}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Location:</span>
                <span className="ml-2 text-gray-900 break-words">
                  {tour.location || (tour.autoGenerateZoom ? 'Virtual (Zoom)' : tour.zoomLink ? 'Virtual' : 'Not set')}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Frequency:</span>
                <span className="ml-2 text-gray-900">Every {tour.frequency} {tour.frequencyUnit}</span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Notice Required:</span>
                <span className="ml-2 text-gray-900">{tour.minNotice} {tour.minNoticeUnit} - {tour.maxNotice} {tour.maxNoticeUnit}</span>
              </div>
            </div>
            
            <div className="mt-3 2xl:mt-4 pt-3 2xl:pt-4 border-t">
              <span className="font-medium text-gray-700 text-xs 2xl:text-sm">Availability Ranges:</span>
              <div className="mt-2 space-y-4">
                {(tour.availabilityRanges || []).map((range, rangeIndex) => (
                  <div key={rangeIndex} className="text-xs 2xl:text-sm">
                    <p className="font-medium text-gray-900 mb-2">
                      {range.startDate || 'No start date'} - {range.endDate || 'No end date'}
                    </p>
                    <div className="space-y-1">
                      {DAYS_OF_WEEK.map(day => {
                        const slots = range.weeklyHours[day] || [];
                        return (
                          <div key={`${rangeIndex}-${day}`}>
                            <span className="inline-block w-20 2xl:w-24 mr-2 font-medium">{day}:</span>
                            {slots.length === 0 ? (
                              <span className="text-gray-500">Unavailable</span>
                            ) : (
                              slots.map((slot, i) => (
                                <span key={i} className="text-gray-900 mr-2 2xl:mr-3 inline-block">
                                  {formatTime12Hour(slot.start)} - {formatTime12Hour(slot.end)}
                                </span>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return <div>Step not found</div>;
  }
};

  const handleSaveTour = async (tourToSave: Tour) => {
    try {
      const availabilityRanges = (tourToSave.availabilityRanges || [])
        .filter((range) => range.startDate || range.endDate || DAYS_OF_WEEK.some((day) => (range.weeklyHours?.[day] || []).length > 0))
        .map((range) => ({
          startDate: range.startDate || '',
          endDate: range.endDate || '',
          weeklyHours: normalizeWeeklyHours(range.weeklyHours),
        }));

      const firstRange = availabilityRanges[0];
      const sortedRanges = [...availabilityRanges]
        .filter((range) => range.startDate || range.endDate)
        .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

      const normalizedTour: Tour = {
        ...tourToSave,
        availabilityRanges: availabilityRanges.length ? availabilityRanges : [createDefaultAvailabilityRange()],
        weeklyHours: firstRange?.weeklyHours || {},
        startDate: sortedRanges[0]?.startDate || firstRange?.startDate || '',
        endDate: sortedRanges[sortedRanges.length - 1]?.endDate || firstRange?.endDate || '',
        dateSpecificDays: sortedRanges
          .filter((range) => range.startDate && range.endDate)
          .map((range) => ({
            startDate: range.startDate,
            endDate: range.endDate,
          })),
      };

      if (isEditing && tourToSave.tourId) {
        const { tourId, ...updateData } = normalizedTour;
        await updateDoc(doc(db, "Tours", tourId), updateData);
        alert('Tour updated!');
      } else {
        const { tourId, ...newTourData } = normalizedTour;
        await addDoc(collection(db, "Tours"), {
          ...newTourData,
          createdAt: new Date().toISOString().split('T')[0],
          upcomingBookings: 0,
          totalBookings: 0,
        });
        alert('Tour created!');
      }
      onBack();
    } catch (error) {
      console.error("Error saving tour:", error);
      alert("Failed to save tour. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 xl:px-8 py-6">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Tour' : 'Create New Tour'}</h1>
              <p className="text-gray-600">Step {currentStep} of {steps.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;

              const handleStepClick = () => {
                setCurrentStep(step.number);
              };

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={handleStepClick}
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex-shrink-0 transition-colors ${
                      isCompleted 
                        ? 'bg-green-600 border-green-600 text-white'
                        : isActive 
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500'
                    }`}
                    aria-label={`Go to step ${step.number}: ${step.title}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                  
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${
                      currentStep > step.number ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Step Indicator - Always Visible */}
          <div className="mt-2">
            <div className="text-center">
              <span className="text-xs text-gray-600">
                Step {currentStep} of {steps.length}: {steps.find(s => s.number === currentStep)?.title}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-1 bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {steps[currentStep - 1].title}
            </h2>
            {currentStep === 1 && (
              <p className="text-gray-600">Let's start with the basic information about your tour.</p>
            )}
            {currentStep === 2 && (
              <p className="text-gray-600">Where will this tour take place? Choose in-person, virtual, or both.</p>
            )}
            {currentStep === 3 && (
              <p className="text-gray-600">Set up when this tour will be available for booking.</p>
            )}
            {currentStep === 4 && (
              <p className="text-gray-600">Configure booking rules and policies for this tour.</p>
            )}
            {currentStep === 5 && (
              <p className="text-gray-600">Review everything and publish your tour.</p>
            )}
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-2">
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${
                    canProceed()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => handleSaveTour({ ...tour, published: false })}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                      Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveTour({ ...tour, published: true })}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    {isEditing ? 'Update & Publish' : 'Publish Tour'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToursDashboard({ onCreateTour, onEditTour, tours, setTours }: { 
  onCreateTour: () => void; 
  onEditTour: (tour: Tour) => void;
  tours: Tour[];
  setTours: Dispatch<SetStateAction<Tour[]>>;
}) {
  const normalizeBlockedTimes = (times: string[]) =>
    Array.from(new Set(times.filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const normalizeBlockedRanges = (ranges: { start: string; end: string }[]) =>
    Array.from(
      new Map(
        ranges
          .filter((range) => range.start && range.end)
          .map((range) => [`${range.start}|${range.end}`, range])
      ).values()
    ).sort((a, b) => `${a.start}|${a.end}`.localeCompare(`${b.start}|${b.end}`));

  const [searchTerm] = useState('');
  const [filterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [reordering, setReordering] = useState(false);
  const [globalHolidayForm, setGlobalHolidayForm] = useState<{
    startDate: string;
    endDate: string;
    unavailable: boolean;
    blockedRanges: { start: string; end: string }[];
  }>({
    startDate: '',
    endDate: '',
    unavailable: true,
    blockedRanges: [{ start: '11:00', end: '13:00' }],
  });

  const sortByDisplayOrder = (a: Tour, b: Tour) =>
    (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER);

  useEffect(() => {
    const toursRef = collection(db, "Tours");

    const unsubscribe = onSnapshot(toursRef, (snapshot) => {
      const tourData = snapshot.docs.map((doc) => ({
        tourId: doc.id,
        ...doc.data(),
      })) as Tour[];

      const orderedTours = [...tourData]
        .map((tour, index) => ({
          ...tour,
          displayOrder: tour.displayOrder ?? index,
        }))
        .sort(sortByDisplayOrder);

      setTours(orderedTours);
    });

    return () => unsubscribe();
  }, [setTours]);

  // const updateTour = async (updatedTour: Tour) => {
  //   if (!updatedTour.tourId) return;
  //   try {
  //     const tourRef = doc(db, "Tours", updatedTour.tourId);
  //     await updateDoc(tourRef, updatedTour);
  //     setTours(tours.map((tour) => (tour.tourId === updatedTour.tourId ? updatedTour : tour)));
  //   } catch (err) {
  //     console.error("Error updating tour:", err);
  //   }
  // };

  const getDateRange = (tour: Tour) => {
    if (tour.availabilityRanges?.length) {
      const labels = tour.availabilityRanges
        .filter((range) => range.startDate || range.endDate)
        .map((range) => {
          if (range.startDate && range.endDate) {
            const start = new Date(range.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const end = new Date(range.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `${start} - ${end}`;
          }
          if (range.startDate) {
            const start = new Date(range.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `From ${start}`;
          }
          return null;
        })
        .filter(Boolean);

      if (labels.length > 0) return labels.join(', ');
    }

    if (tour.startDate && tour.endDate) {
      const start = new Date(tour.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const end = new Date(tour.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${start} - ${end}`;
    } else if (tour.startDate) {
      const start = new Date(tour.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `From ${start}`;
    }
    return "No dates set";
  };

  const handleDeleteTour = async (tourId: string) => {
    if (confirm("Are you sure you want to delete this tour? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "Tours", tourId));
        setTours(tours.filter((tour) => tour.tourId !== tourId));
      } catch (err) {
        console.error("Error deleting tour:", err);
      }
    }
  };

  const handleTogglePublish = async (tourId: string) => {
    const tour = tours.find((t) => t.tourId === tourId);
    if (!tour) return;
    try {
      const tourRef = doc(db, "Tours", tourId);
      await updateDoc(tourRef, { published: !tour.published });
      setTours(
        tours.map((t) =>
          t.tourId === tourId ? { ...t, published: !t.published } : t
        )
      );
    } catch (err) {
      console.error("Error toggling publish:", err);
    }
  };

  const moveTour = async (tourId: string, direction: 'up' | 'down') => {
    const ordered = [...tours].sort(sortByDisplayOrder);
    const index = ordered.findIndex(t => t.tourId === tourId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];

    const updated = ordered.map((tour, idx) => ({ ...tour, displayOrder: idx }));
    setTours(updated);
    setReordering(true);
    try {
      await Promise.all(
        updated.map(t =>
          updateDoc(doc(db, "Tours", t.tourId), { displayOrder: t.displayOrder ?? 0 })
        )
      );
    } catch (err) {
      console.error("Error updating tour order:", err);
    } finally {
      setReordering(false);
    }
  };

  const getLocationDisplay = (tour: Tour) => {
    if (tour.location && (tour.zoomLink || tour.autoGenerateZoom)) {
      return 'Hybrid';
    } else if (tour.location) {
      return 'In-Person';
    } else if (tour.zoomLink || tour.autoGenerateZoom) {
      return 'Virtual';
    }
    return 'Not Set';
  };

  const filteredTours = tours.filter((tour) => {
    const matchesSearch =
      tour.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "published" && tour.published) ||
      (filterStatus === "draft" && !tour.published);
    return matchesSearch && matchesStatus;
  });

  const orderedFilteredTours = [...filteredTours].sort(sortByDisplayOrder);

  const universalOverrides = useMemo(() => {
    const map: Record<string, { startDate: string; endDate?: string; unavailable?: boolean; slots?: any[]; blockedTimes?: string[]; blockedRanges?: { start: string; end: string }[] }> = {};
    tours.forEach((tour) => {
      (tour.dateSpecificBlockDays || []).forEach((d) => {
        if (d.appliesToAllTours && (d.unavailable || (d.slots && d.slots.length) || (d.blockedTimes && d.blockedTimes.length) || (d.blockedRanges && d.blockedRanges.length))) {
          const key = `${d.startDate}|${d.endDate || d.startDate}`;
          const existing = map[key];
          map[key] = {
            startDate: d.startDate,
            endDate: d.endDate,
            unavailable: existing?.unavailable || d.unavailable,
            slots: [...(existing?.slots || []), ...(d.slots || [])],
            blockedTimes: normalizeBlockedTimes([...(existing?.blockedTimes || []), ...(d.blockedTimes || [])]),
            blockedRanges: normalizeBlockedRanges([...(existing?.blockedRanges || []), ...(d.blockedRanges || [])]),
          };
        }
      });
    });
    return Object.values(map).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [tours]);

  const addUniversalHoliday = async () => {
    if (!globalHolidayForm.startDate) {
      alert('Please select a start date');
      return;
    }
    const blockedRanges = globalHolidayForm.unavailable
      ? []
      : normalizeBlockedRanges(globalHolidayForm.blockedRanges || []);
    const newOverride = {
      startDate: globalHolidayForm.startDate,
      endDate: globalHolidayForm.endDate || globalHolidayForm.startDate,
      slots: [],
      blockedTimes: [],
      blockedRanges,
      unavailable: globalHolidayForm.unavailable,
      appliesToAllTours: true,
    };

    try {
      await Promise.all(
        tours.map(async (tour) => {
          if (!tour.tourId) return;
          const existing = tour.dateSpecificBlockDays || [];
          const matchIndex = existing.findIndex(
            (d) =>
              d.appliesToAllTours &&
              d.startDate === newOverride.startDate &&
              (d.endDate || d.startDate) === (newOverride.endDate || newOverride.startDate)
          );

          const updated = [...existing];
          if (matchIndex >= 0) {
            const current = updated[matchIndex];
            updated[matchIndex] = {
              ...current,
              unavailable: newOverride.unavailable,
              appliesToAllTours: true,
              slots: newOverride.unavailable ? [] : (current.slots || []),
              blockedTimes: newOverride.unavailable ? [] : (current.blockedTimes || []),
              blockedRanges: newOverride.unavailable
                ? []
                : normalizeBlockedRanges([...(current.blockedRanges || []), ...newOverride.blockedRanges]),
            };
          } else {
            updated.push(newOverride);
          }
          await updateDoc(doc(db, 'Tours', tour.tourId), { dateSpecificBlockDays: updated });
        })
      );
      setTours((prev: Tour[]) =>
        prev.map((tour: Tour) => ({
          ...tour,
          dateSpecificBlockDays: (() => {
            const existing = [...(tour.dateSpecificBlockDays || [])];
            const matchIndex = existing.findIndex(
              (d: any) =>
                d.appliesToAllTours &&
                d.startDate === newOverride.startDate &&
                (d.endDate || d.startDate) === (newOverride.endDate || newOverride.startDate)
            );

            if (matchIndex >= 0) {
              const current = existing[matchIndex];
              existing[matchIndex] = {
                ...current,
                unavailable: newOverride.unavailable,
                appliesToAllTours: true,
                slots: newOverride.unavailable ? [] : (current.slots || []),
                blockedTimes: newOverride.unavailable ? [] : (current.blockedTimes || []),
                blockedRanges: newOverride.unavailable
                  ? []
                  : normalizeBlockedRanges([...(current.blockedRanges || []), ...newOverride.blockedRanges]),
              };
              return existing;
            }

            return [...existing, newOverride];
          })(),
        }))
      );
      setGlobalHolidayForm({ startDate: '', endDate: '', unavailable: true, blockedRanges: [{ start: '11:00', end: '13:00' }] });
    } catch (err) {
      console.error('Error adding universal holiday:', err);
      alert('Failed to add universal holiday date.');
    }
  };

  const removeUniversalHoliday = async (startDate: string, endDate?: string) => {
    try {
      await Promise.all(
        tours.map(async (tour) => {
          if (!tour.tourId) return;
          const filtered = (tour.dateSpecificBlockDays || []).filter(
            (d) =>
              !(
                d.appliesToAllTours &&
                d.startDate === startDate &&
                (d.endDate || d.startDate) === (endDate || startDate)
              )
          );
          await updateDoc(doc(db, 'Tours', tour.tourId), { dateSpecificBlockDays: filtered });
        })
      );
      setTours(prev =>
        prev.map((tour: Tour) => ({
          ...tour,
          dateSpecificBlockDays: (tour.dateSpecificBlockDays || []).filter(
            (d: any) =>
              !(
                d.appliesToAllTours &&
                d.startDate === startDate &&
                (d.endDate || d.startDate) === (endDate || startDate)
              )
          ),
        }))
      );
    } catch (err) {
      console.error('Error removing universal holiday:', err);
      alert('Failed to remove universal holiday.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tours Management</h1>
              <p className="text-gray-600 mt-1">Manage your tours and availability</p>
            </div>
            <button
              onClick={onCreateTour}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 font-medium"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Tour</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {orderedFilteredTours.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tours found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first tour'
                  }
                </p>
                {!searchTerm && filterStatus === 'all' && (
                  <button
                    onClick={onCreateTour}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Create Your First Tour
                  </button>
                )}
              </div>
            ) : (
              orderedFilteredTours.map((tour, idx) => (
                <div key={tour.tourId} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{tour.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          tour.published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {tour.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-4 line-clamp-2">{tour.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{tour.duration} {tour.durationUnit}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Max: {tour.maxAttendeesPerBooking} People Per Session</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getLocationDisplay(tour) === 'Virtual' ? (
                            <Video className="h-4 w-4 text-gray-400" />
                          ) : getLocationDisplay(tour) === 'Hybrid' ? (
                            <Globe className="h-4 w-4 text-gray-400" />
                          ) : (
                            <MapPin className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-gray-600">{getLocationDisplay(tour)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 truncate">{getDateRange(tour)}</span>
                        </div>
                      </div>
                      
                      {tour.published && (
                        <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-gray-100">
                        </div>
                      )}
                    </div>
                    
                    <div className="flex w-full sm:w-auto items-center sm:items-start justify-between sm:justify-end gap-3 sm:gap-2">
                      <div className="flex sm:flex-col gap-1 sm:mr-2">
                        <button
                          onClick={() => moveTour(tour.tourId, 'up')}
                          disabled={reordering || idx === 0}
                          className={`flex items-center justify-center px-3 py-2 sm:p-1 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 ${idx === 0 || reordering ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                          <span className="ml-2 text-xs sm:hidden">Up</span>
                        </button>
                        <button
                          onClick={() => moveTour(tour.tourId, 'down')}
                          disabled={reordering || idx === orderedFilteredTours.length - 1}
                          className={`flex items-center justify-center px-3 py-2 sm:p-1 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 ${idx === orderedFilteredTours.length - 1 || reordering ? 'opacity-40 cursor-not-allowed' : ''}`}
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                          <span className="ml-2 text-xs sm:hidden">Down</span>
                        </button>
                      </div>
                      
                      <button
                        onClick={() => onEditTour(tour)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit Tour"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleTogglePublish(tour.tourId!)}
                        className={`p-2 rounded-lg ${
                          tour.published
                            ? 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={tour.published ? 'Unpublish Tour' : 'Publish Tour'}
                      >
                        {tour.published ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteTour(tour.tourId!)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete Tour"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Universal Holidays Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Block Out Dates
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Dates marked apply to all tours.
              </p>

              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={globalHolidayForm.startDate}
                  onChange={(e) =>
                    setGlobalHolidayForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
                <label className="block text-sm font-medium text-gray-700">End Date (optional)</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  value={globalHolidayForm.endDate}
                  onChange={(e) =>
                    setGlobalHolidayForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    checked={globalHolidayForm.unavailable}
                    onChange={(e) =>
                      setGlobalHolidayForm((prev) => ({
                        ...prev,
                        unavailable: e.target.checked,
                        blockedRanges: e.target.checked ? [] : (prev.blockedRanges.length ? prev.blockedRanges : [{ start: '11:00', end: '13:00' }])
                      }))
                    }
                  />
                  <span>Entire day is unavailable (holiday/closed)</span>
                </label>

                {!globalHolidayForm.unavailable && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Blocked Time Ranges</label>
                      <button
                        type="button"
                        onClick={() =>
                          setGlobalHolidayForm((prev) => ({
                            ...prev,
                            blockedRanges: [...prev.blockedRanges, { start: '11:00', end: '13:00' }]
                          }))
                        }
                        className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {globalHolidayForm.blockedRanges.length === 0 && (
                      <p className="text-xs text-gray-500">No blocked ranges set.</p>
                    )}
                    {globalHolidayForm.blockedRanges.map((range, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="time"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                          value={range.start}
                          onChange={(e) =>
                            setGlobalHolidayForm((prev) => {
                              const blockedRanges = [...prev.blockedRanges];
                              blockedRanges[idx] = { ...range, start: e.target.value };
                              return { ...prev, blockedRanges };
                            })
                          }
                        />
                        <span className="text-gray-500 text-xs">to</span>
                        <input
                          type="time"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                          value={range.end}
                          onChange={(e) =>
                            setGlobalHolidayForm((prev) => {
                              const blockedRanges = [...prev.blockedRanges];
                              blockedRanges[idx] = { ...range, end: e.target.value };
                              return { ...prev, blockedRanges };
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setGlobalHolidayForm((prev) => ({
                              ...prev,
                              blockedRanges: prev.blockedRanges.filter((_, i) => i !== idx)
                            }))
                          }
                          className="text-red-600 hover:bg-red-50 p-1 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={addUniversalHoliday}
                  className="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Add Blocked Date
                </button>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Existing dates</h4>
                {universalOverrides.length === 0 ? (
                  <p className="text-sm text-gray-500">None set yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {universalOverrides.map((d) => (
                      <div
                        key={`${d.startDate}|${d.endDate || d.startDate}`}
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <div className="text-gray-800 flex-1">
                          <div>
                            {d.startDate}
                            {d.endDate && d.endDate !== d.startDate ? ` → ${d.endDate}` : ''}
                          </div>
                          {d.blockedTimes && d.blockedTimes.length > 0 && (
                            <div className="text-xs text-amber-700 mt-1">
                              Blocked times: {d.blockedTimes.join(', ')}
                            </div>
                          )}
                          {d.blockedRanges && d.blockedRanges.length > 0 && (
                            <div className="text-xs text-amber-700 mt-1">
                              Blocked ranges: {d.blockedRanges.map((range) => `${range.start} - ${range.end}`).join(', ')}
                            </div>
                          )}
                          {d.slots && d.slots.length > 0 && (
                            <div className="text-xs text-gray-600 mt-1">
                              {d.slots.map((s: any, i: number) => (
                                <span key={i} className="inline-block mr-2">{s.start} - {s.end}</span>
                              ))}
                            </div>
                          )}
                          {d.unavailable && <div className="text-xs text-red-600">Unavailable</div>}
                        </div>
                        <button
                          onClick={() => removeUniversalHoliday(d.startDate, d.endDate)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ToursManagement() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'create'>('dashboard');
  const [editingTour, setEditingTour] = useState<Tour | undefined>(undefined);
  const [tours, setTours] = useState<Tour[]>([]);

  const handleCreateTour = () => {
    setEditingTour(undefined);
    setCurrentPage('create');
  };

  const handleEditTour = (tour: Tour) => {
    setEditingTour(tour);
    setCurrentPage('create');
  };

  const handleSaveTour = (tour: Tour) => {
    if (editingTour) {
      // Update existing tour
      setTours((prevTours: Tour[]) => 
        prevTours.map((t: Tour) => t.tourId === tour.tourId ? tour : t)
      );
    } else {
      // Add new tour
      setTours((prevTours: Tour[]) => [...prevTours, { ...tour, displayOrder: prevTours.length }]);
    }
    setEditingTour(undefined);
  };

  return (
    <>
      {currentPage === 'dashboard' ? (
        <ToursDashboard 
          tours={tours}
          setTours={setTours}
          onCreateTour={handleCreateTour} 
          onEditTour={handleEditTour}
        />
      ) : (
        <TourFormPage 
          onBack={() => setCurrentPage('dashboard')} 
          editingTour={editingTour}
          onSaveTour={handleSaveTour}
        />
      )}
    </>
  );
}
