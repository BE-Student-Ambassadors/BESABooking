import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Clock, MapPin, Users, Settings, FileText, Bell, CheckCircle,Plus,X,Globe,Video,AlertCircle,Edit3,Trash2,Eye} from 'lucide-react';
import { db } from "../../../../src/firebase.ts";
import { collection, onSnapshot, deleteDoc, doc, updateDoc, addDoc } from "firebase/firestore";

{/* Create/Edit Tour Button adaptable for small screen */}
{/* Allow to move order of tours (group first, etc) */}
{/* Have it show the dates range instead of days in the front */}
{/* Availabilty: allow for holiday dates */}


const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function TourFormPage({ onBack, editingTour }: { onBack: () => void; editingTour?: Tour; onSaveTour: (tour: Tour) => void;}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [tour, setTour] = useState<Tour>(editingTour || {
    tourId: '',
    title: '',
    description: '',
    duration: 60,
    durationUnit: 'minutes',
    maxAttendeesPerBooking: 5,
    maxBookings: 3,
    location: '',
    zoomLink: '',
    autoGenerateZoom: false,
    weeklyHours: {},
    dateSpecificBlockDays: [],
    dateSpecificDays: [],
    frequency: 60,
    frequencyUnit: 'minutes',
    registrationLimit: 10,
    minNotice: 24,
    minNoticeUnit: 'hours',
    maxNotice: 30,
    maxNoticeUnit: 'days',
    bufferTime: 15,
    bufferUnit: 'minutes',
    cancellationPolicy: '',
    reschedulingPolicy: '',
    intakeForm: {
      firstName: true,
      lastName: true,
      email: true,
      phone: false,
      attendeeCount: true,
      majorsInterested: false,
      customQuestions: []
    },
    reminderEmails: [{ timing: 24, unit: 'hours' }],
    sessionInstructions: '',
    published: false
  });

  const isEditing = !!editingTour;

  const steps = [
    { number: 1, title: 'Basic Info', icon: FileText },
    { number: 2, title: 'Location', icon: MapPin },
    { number: 3, title: 'Availability', icon: Calendar },
    { number: 4, title: 'Scheduling Rules', icon: Settings },
    { number: 5, title: 'Intake Form', icon: Users },
    { number: 6, title: 'Notifications', icon: Bell },
    { number: 7, title: 'Review', icon: CheckCircle }
  ];

  const updateTour = (updates: Partial<Tour>) => {
    setTour(prev => ({ ...prev, ...updates }));
  };

  const addWeeklyTimeSlot = (day: string) => {
    const newSlot = { start: '09:00', end: '17:00' };
    updateTour({
      weeklyHours: {
        ...tour.weeklyHours,
        [day]: [...(tour.weeklyHours[day] || []), newSlot]
      }
    });
  };

  const removeWeeklyTimeSlot = (day: string, index: number) => {
    const daySlots = tour.weeklyHours[day] || [];
    const newSlots = daySlots.filter((_, i) => i !== index);
    updateTour({
      weeklyHours: {
        ...tour.weeklyHours,
        [day]: newSlots
      }
    });
  };

  const addCustomQuestion = () => {
    const newQuestion = {
      question: '',
      type: 'text' as const,
      required: false,
      options: []
    };
    updateTour({
      intakeForm: {
        ...tour.intakeForm,
        customQuestions: [...tour.intakeForm.customQuestions, newQuestion]
      }
    });
  };

  const removeCustomQuestion = (index: number) => {
    const newQuestions = tour.intakeForm.customQuestions.filter((_, i) => i !== index);
    updateTour({
      intakeForm: {
        ...tour.intakeForm,
        customQuestions: newQuestions
      }
    });
  };

  const addReminderEmail = () => {
    updateTour({
      reminderEmails: [...tour.reminderEmails, { timing: 24, unit: 'hours' }]
    });
  };

  const removeReminderEmail = (index: number) => {
    updateTour({
      reminderEmails: tour.reminderEmails.filter((_, i) => i !== index)
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return tour.title.trim() && tour.description.trim() && tour.duration > 0;
      case 2:
        return tour.location.trim() || tour.zoomLink.trim() || tour.autoGenerateZoom;
      default:
        return true;
    }
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
            <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3 2xl:gap-0 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                <Video className="inline h-4 w-4 mr-1" />
                Virtual Option
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tour.autoGenerateZoom}
                  onChange={(e) => updateTour({ 
                    autoGenerateZoom: e.target.checked,
                    zoomLink: e.target.checked ? '' : tour.zoomLink
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs 2xl:text-sm text-gray-600">Auto-generate Zoom link</span>
              </label>
            </div>

            {!tour.autoGenerateZoom && (
              <input
                type="url"
                className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
                placeholder="https://zoom.us/j/..."
                value={tour.zoomLink}
                onChange={(e) => updateTour({ zoomLink: e.target.value })}
              />
            )}

            {tour.autoGenerateZoom && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 2xl:p-4">
                <p className="text-xs 2xl:text-sm text-gray-600">
                  <Globe className="inline h-4 w-4 mr-1" />
                  A Zoom link will be automatically generated when the tour is published
                </p>
              </div>
            )}
          </div>
        </div>
      );

    case 3:
  return (
  <div className="space-y-6 2xl:space-y-8">

    {/* Weekly Recurring Hours */}
    <div>
      <h3 className="text-base 2xl:text-lg font-medium text-gray-900 mb-3 2xl:mb-4">Weekly Recurring Hours</h3>
      <div className="space-y-3 2xl:space-y-4">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="border border-gray-200 rounded-lg p-3 2xl:p-4">
            <div className="flex items-center justify-between mb-2 2xl:mb-3">
              <h4 className="text-sm 2xl:text-base font-medium text-gray-900">{day}</h4>
              <button
                type="button"
                onClick={() => addWeeklyTimeSlot(day)}
                className="text-blue-600 hover:bg-blue-50 p-1 rounded-lg"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {(tour.weeklyHours[day] || []).length === 0 && (
              <p className="text-gray-500 text-xs 2xl:text-sm">No time slots set for this day</p>
            )}

            {(tour.weeklyHours[day] || []).map((slot, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2 last:mb-0">
                <input
                  type="time"
                  className="flex-1 px-2 2xl:px-3 py-1 2xl:py-2 border border-gray-300 rounded-lg text-xs 2xl:text-sm"
                  value={slot.start}
                  onChange={(e) => {
                    const newSlots = [...(tour.weeklyHours[day] || [])];
                    newSlots[index] = { ...slot, start: e.target.value };
                    updateTour({ weeklyHours: { ...tour.weeklyHours, [day]: newSlots } });
                  }}
                />
                <span className="text-gray-500 text-xs 2xl:text-sm">to</span>
                <input
                  type="time"
                  className="flex-1 px-2 2xl:px-3 py-1 2xl:py-2 border border-gray-300 rounded-lg text-xs 2xl:text-sm"
                  value={slot.end}
                  onChange={(e) => {
                    const newSlots = [...(tour.weeklyHours[day] || [])];
                    newSlots[index] = { ...slot, end: e.target.value };
                    updateTour({ weeklyHours: { ...tour.weeklyHours, [day]: newSlots } });
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeWeeklyTimeSlot(day, index)}
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

    {/* Date-Specific Days */}
    <div className="border-t pt-4 2xl:pt-6">
      <h3 className="text-base 2xl:text-lg font-medium text-gray-900 mb-3 2xl:mb-4">Date-Specific Availability</h3>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 2xl:p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">Start Date</label>
        <input
          type="date"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          value={tour.startDate || ''}
          onChange={(e) => updateTour({ startDate: e.target.value })}
        />

        <label className="block text-sm font-medium text-gray-700">End Date</label>
        <input
          type="date"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          value={tour.endDate || ''}
          onChange={(e) => updateTour({ endDate: e.target.value })}
        />
        {tour.startDate && tour.endDate && new Date(tour.startDate) > new Date(tour.endDate) && (
          <p className="text-red-600 text-xs">End date must be after start date</p>
        )}
      </div>
    </div>

    {/* Holidays & Special Events Block Off */}
    <div className="border-t pt-4 2xl:pt-6">
  <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3 2xl:gap-0 mb-3 2xl:mb-4">
    <div>
      <h3 className="text-base 2xl:text-lg font-medium text-gray-900">Holidays & Special Events</h3>
      <p className="text-xs 2xl:text-sm text-gray-500 mt-1">Block off specific dates</p>
    </div>
    <button
      type="button"
      onClick={() => {
        updateTour({
          dateSpecificBlockDays: [
            ...(tour.dateSpecificBlockDays || []),
            { date: '', slots: [], unavailable: true }
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
              value={dateOverride.date}
              onChange={(e) => {
                const newDateSpecific = [...(tour.dateSpecificBlockDays || [])];
                newDateSpecific[index] = { ...dateOverride, date: e.target.value };
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
                  unavailable: e.target.checked,
                  slots: e.target.checked ? [] : dateOverride.slots
                };
                updateTour({ dateSpecificBlockDays: newDateSpecific });
              }}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Mark as unavailable (holiday/closed)</span>
          </label>
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
              <p className="text-gray-500 text-xs mb-2">No custom slots (will use weekly hours)</p>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Registration Limit</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base"
              placeholder="Maximum people per session"
              value={tour.registrationLimit}
              onChange={(e) => updateTour({ registrationLimit: parseInt(e.target.value) || 1 })}
            />
          </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time Between Tours</label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="0"
                className="w-16 2xl:w-24 px-2 2xl:px-3 py-2 2xl:py-3 border border-gray-300 rounded-lg text-sm 2xl:text-base"
                value={tour.bufferTime}
                onChange={(e) => updateTour({ bufferTime: parseInt(e.target.value) || 0 })}
              />
              <select
                className="flex-1 px-2 2xl:px-3 py-2 2xl:py-3 border border-gray-300 rounded-lg text-xs 2xl:text-sm"
                value={tour.bufferUnit}
                onChange={(e) => updateTour({ bufferUnit: e.target.value as 'minutes' | 'hours' })}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
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
          <div>
            <h3 className="text-base 2xl:text-lg font-medium text-gray-900 mb-3 2xl:mb-4">Required Information</h3>
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 2xl:gap-4">
              {Object.entries({
                firstName: 'First Name',
                lastName: 'Last Name',
                email: 'Email Address',
                phone: 'Phone Number',
                attendeeCount: 'Number of Attendees',
                majorsInterested: 'Majors of Interest'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2 2xl:space-x-3 p-2 2xl:p-0">
                  <input
                    type="checkbox"
                    checked={tour.intakeForm[key as keyof typeof tour.intakeForm] as boolean}
                    onChange={(e) => updateTour({
                      intakeForm: {
                        ...tour.intakeForm,
                        [key]: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span className="text-xs 2xl:text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 2xl:pt-6">
            <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3 2xl:gap-0 mb-3 2xl:mb-4">
              <h3 className="text-base 2xl:text-lg font-medium text-gray-900">Custom Questions</h3>
              <button
                type="button"
                onClick={addCustomQuestion}
                className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center space-x-1 self-start"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Add Question</span>
              </button>
            </div>

            <div className="space-y-3 2xl:space-y-4">
              {tour.intakeForm.customQuestions.map((question, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 2xl:p-4">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        className="w-full px-2 2xl:px-3 py-1 2xl:py-2 border border-gray-300 rounded-lg text-sm 2xl:text-base"
                        placeholder="Enter your question..."
                        value={question.question}
                        onChange={(e) => {
                          const newQuestions = [...tour.intakeForm.customQuestions];
                          newQuestions[index] = { ...question, question: e.target.value };
                          updateTour({
                            intakeForm: { ...tour.intakeForm, customQuestions: newQuestions }
                          });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomQuestion(index)}
                      className="text-red-600 hover:bg-red-50 p-1 rounded-lg flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 2xl:gap-4">
                    <select
                      className="px-2 2xl:px-3 py-1 2xl:py-2 border border-gray-300 rounded-lg text-xs 2xl:text-sm"
                      value={question.type}
                      onChange={(e) => {
                        const newQuestions = [...tour.intakeForm.customQuestions];
                        newQuestions[index] = { ...question, type: e.target.value as any };
                        updateTour({
                          intakeForm: { ...tour.intakeForm, customQuestions: newQuestions }
                        });
                      }}
                    >
                      <option value="text">Short Text</option>
                      <option value="textarea">Long Text</option>
                      <option value="select">Dropdown</option>
                      <option value="checkbox">Checkbox</option>
                    </select>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => {
                          const newQuestions = [...tour.intakeForm.customQuestions];
                          newQuestions[index] = { ...question, required: e.target.checked };
                          updateTour({
                            intakeForm: { ...tour.intakeForm, customQuestions: newQuestions }
                          });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs 2xl:text-sm text-gray-600">Required</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 6:
      return (
        <div className="space-y-4 2xl:space-y-6">
          <div>
            <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3 2xl:gap-0 mb-3 2xl:mb-4">
              <h3 className="text-base 2xl:text-lg font-medium text-gray-900">Reminder Emails</h3>
              <button
                type="button"
                onClick={addReminderEmail}
                className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center space-x-1 self-start"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Add Reminder</span>
              </button>
            </div>

            <div className="space-y-2 2xl:space-y-3">
              {tour.reminderEmails.map((reminder, index) => (
                <div key={index} className="flex flex-col 2xl:flex-row 2xl:items-center gap-2 2xl:gap-3 bg-gray-50 p-3 rounded-lg">
                  <span className="text-xs 2xl:text-sm text-gray-600">Send reminder</span>
                  <div className="flex items-center space-x-2 flex-1">
                    <input
                      type="number"
                      min="1"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      value={reminder.timing}
                      onChange={(e) => {
                        const newReminders = [...tour.reminderEmails];
                        newReminders[index] = { ...reminder, timing: parseInt(e.target.value) || 1 };
                        updateTour({ reminderEmails: newReminders });
                      }}
                    />
                    <select
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs 2xl:text-sm"
                      value={reminder.unit}
                      onChange={(e) => {
                        const newReminders = [...tour.reminderEmails];
                        newReminders[index] = { ...reminder, unit: e.target.value as any };
                        updateTour({ reminderEmails: newReminders });
                      }}
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                    <span className="text-xs 2xl:text-sm text-gray-600 whitespace-nowrap">before tour</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReminderEmail(index)}
                    className="text-red-600 hover:bg-red-50 p-1 rounded self-start 2xl:self-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Instructions</label>
            <textarea
              rows={4}
              className="w-full px-3 2xl:px-4 py-2 2xl:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm 2xl:text-base resize-y"
              placeholder="Instructions that will be sent to attendees before the tour (parking info, what to bring, meeting location, etc.)"
              value={tour.sessionInstructions}
              onChange={(e) => updateTour({ sessionInstructions: e.target.value })}
            />
          </div>
        </div>
      );

    case 7:
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
              <span className="font-medium text-gray-700 text-xs 2xl:text-sm">Weekly Schedule:</span>
              <div className="mt-2 space-y-1">
                {DAYS_OF_WEEK.map(day => {
                  const slots = tour.weeklyHours[day] || [];
                  return (
                    <div key={day} className="text-xs 2xl:text-sm">
                      <span className="inline-block w-16 2xl:w-20 font-medium">{day}:</span>
                      {slots.length === 0 ? (
                        <span className="text-gray-500">Unavailable</span>
                      ) : (
                        slots.map((slot, i) => (
                          <span key={i} className="text-gray-900 mr-2 2xl:mr-3 inline-block">
                            {slot.start} - {slot.end}
                          </span>
                        ))
                      )}
                    </div>
                  );
                })}
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
      if (isEditing && tourToSave.tourId) {
        const { tourId, ...updateData } = tourToSave;
        await updateDoc(doc(db, "Tours", tourId), updateData);
        alert('Tour updated!');
      } else {
        const { tourId, ...newTourData } = tourToSave;
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
              
              return (
                <div key={step.number} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex-shrink-0 ${
                    isCompleted 
                      ? 'bg-green-600 border-green-600 text-white'
                      : isActive 
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </div>
                  
                  {/* Progress Line */}
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
              <p className="text-gray-600">Customize what information you'll collect from tour attendees.</p>
            )}
            {currentStep === 6 && (
              <p className="text-gray-600">Set up automated communications for tour attendees.</p>
            )}
            {currentStep === 7 && (
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
  setTours: (tours: Tour[]) => void;
}) {
  const [searchTerm] = useState('');
  const [filterStatus] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    const toursRef = collection(db, "Tours");

    const unsubscribe = onSnapshot(toursRef, (snapshot) => {
      const tourData = snapshot.docs.map((doc) => ({
        tourId: doc.id,
        ...doc.data(),
      })) as Tour[];
      setTours(tourData);
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

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tours List */}
        <div className="space-y-4">
          {filteredTours.length === 0 ? (
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
            filteredTours.map((tour) => (
              <div key={tour.tourId} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
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
                        {/* <div className="text-sm">
                          <span className="text-gray-600">Upcoming: </span>
                          <span className="font-medium text-blue-600">{tour.upcomingBookings || 0}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Total Bookings: </span>
                          <span className="font-medium text-gray-900">{tour.totalBookings || 0}</span>
                        </div> */}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {/* <button
                      onClick={() => alert(`Viewing tour: ${tour.title}`)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Tour"
                    >
                      <Eye className="h-4 w-4" />
                    </button> */}
                    
                    <button
                      onClick={() => onEditTour(tour)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
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
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
      setTours(prevTours => 
        prevTours.map(t => t.tourId === tour.tourId ? tour : t)
      );
    } else {
      // Add new tour
      setTours(prevTours => [...prevTours, tour]);
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