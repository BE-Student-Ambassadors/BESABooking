import { useState, useEffect } from 'react';
import { Edit3, Save, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../src/firebase.ts';

interface TimeSlot {
  start: string;
  end: string;
  id: string;
}

interface DayHours {
  available: boolean;
  timeSlots: TimeSlot[];
}

interface Besa {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  officeHours: {
    [day: string]: DayHours;
  };
}

export default function OfficeHoursView() {
  const [besas, setBesas] = useState<Besa[]>([]);
  const [editingOfficeHours, setEditingOfficeHours] = useState<string | null>(null);
  const [expandedBesas, setExpandedBesas] = useState<Set<string>>(new Set());

  const orderedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  useEffect(() => {
  const fetchBesas = async () => {
    const snapshot = await getDocs(collection(db, 'Besas'));
    const besaData = snapshot.docs.map(doc => {
      const data = doc.data() as Omit<Besa, 'id'>;

      const convertedOfficeHours: { [day: string]: DayHours } = {};
      Object.entries(data.officeHours || {}).forEach(([day, hours]) => {
        if (typeof hours === 'object' && 'start' in hours && 'end' in hours) {
          convertedOfficeHours[day] = {
            available: !!hours.available,
            timeSlots: hours.available ? [{
              id: generateId(),
              start: typeof hours.start === 'string' ? hours.start : '09:00',
              end: typeof hours.end === 'string' ? hours.end : '17:00'
            }] : []
          };
        } else if (typeof hours === 'object' && 'timeSlots' in hours) {
          convertedOfficeHours[day] = {
            available: !!hours.available,
            timeSlots: Array.isArray(hours.timeSlots)
              ? hours.timeSlots.map((slot: any) => ({
                  id: typeof slot.id === 'string' ? slot.id : generateId(),
                  start: typeof slot.start === 'string' ? slot.start : '09:00',
                  end: typeof slot.end === 'string' ? slot.end : '17:00'
                }))
              : []
          };
        } else {
          convertedOfficeHours[day] = {
            available: false,
            timeSlots: []
          };
        }
      });

      return {
        id: doc.id,
        ...data,
        officeHours: convertedOfficeHours,
      };
    });
    setBesas(besaData);
  };
  fetchBesas();
}, []);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  {/* Convert 24hr to 12hr format */}
  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

   {/* Convert 12hr to 24hr format */}
  const formatTime24Hour = (time12: string) => {
    if (!time12) return '';
    const [time, ampm] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours, 10);
    
    if (ampm === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  };

  const toggleBesaExpansion = (besaId: string) => {
    setExpandedBesas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(besaId)) {
        newSet.delete(besaId);
      } else {
        newSet.add(besaId);
      }
      return newSet;
    });
  };

  const getCompiledSchedule = () => {
    const schedule: { [key: string]: { timeSlots: { start: string; end: string; besas: string[] }[] } } = {};

    orderedDays.forEach(day => {
      const availableBesas = besas.filter(besa =>
        besa.officeHours?.[day]?.available && besa.officeHours[day].timeSlots.length > 0
      );

      if (availableBesas.length > 0) {
        const allTimeSlots: { start: string; end: string; besas: string[] }[] = [];
        
        availableBesas.forEach(besa => {
          besa.officeHours[day].timeSlots.forEach(slot => {
            const existingSlot = allTimeSlots.find(s => s.start === slot.start && s.end === slot.end);
            if (existingSlot) {
              existingSlot.besas.push(besa.name);
            } else {
              allTimeSlots.push({
                start: slot.start,
                end: slot.end,
                besas: [besa.name]
              });
            }
          });
        });

        allTimeSlots.sort((a, b) => a.start.localeCompare(b.start));
        
        schedule[day] = { timeSlots: allTimeSlots };
      }
    });

    return schedule;
  };

  const addTimeSlot = (besaId: string, day: string) => {
    setBesas(prev => prev.map(besa =>
      besa.id === besaId
        ? {
          ...besa,
          officeHours: {
            ...besa.officeHours,
            [day]: {
              ...besa.officeHours[day],
              timeSlots: [
                ...besa.officeHours[day].timeSlots,
                { id: generateId(), start: '09:00', end: '10:00' }
              ]
            }
          }
        }
        : besa
    ));
  };

  const removeTimeSlot = (besaId: string, day: string, slotId: string) => {
    setBesas(prev => prev.map(besa =>
      besa.id === besaId
        ? {
          ...besa,
          officeHours: {
            ...besa.officeHours,
            [day]: {
              ...besa.officeHours[day],
              timeSlots: besa.officeHours[day].timeSlots.filter(slot => slot.id !== slotId)
            }
          }
        }
        : besa
    ));
  };

  const updateTimeSlot = (besaId: string, day: string, slotId: string, field: 'start' | 'end', value: string) => {
    setBesas(prev => prev.map(besa =>
      besa.id === besaId
        ? {
          ...besa,
          officeHours: {
            ...besa.officeHours,
            [day]: {
              ...besa.officeHours[day],
              timeSlots: besa.officeHours[day].timeSlots.map(slot =>
                slot.id === slotId ? { ...slot, [field]: value } : slot
              )
            }
          }
        }
        : besa
    ));
  };

  const updateBesaAvailability = (besaId: string, day: string, available: boolean) => {
    setBesas(prev => prev.map(besa =>
      besa.id === besaId
        ? {
          ...besa,
          officeHours: {
            ...besa.officeHours,
            [day]: {
              ...besa.officeHours[day],
              available,
              timeSlots: available ? (besa.officeHours[day]?.timeSlots || [{ id: generateId(), start: '09:00', end: '17:00' }]) : []
            }
          }
        }
        : besa
    ));
  };

  const saveOfficeHoursChanges = async (besa: Besa) => {
    try {
      const besaDocRef = doc(db, 'Besas', besa.id);
      await updateDoc(besaDocRef, {
        officeHours: besa.officeHours,
      });
      console.log('Office hours saved!');
    } catch (error) {
      console.error('Failed to save office hours:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const compiledSchedule = getCompiledSchedule();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Office Hours Management</h1>
        <p className="text-gray-600">Manage individual BESA office hours and view compiled schedule</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Individual BESA Office Hours */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Individual BESA Hours</h2>
          {besas.map((besa) => (
            <div key={besa.id} className="bg-white rounded-xl shadow-sm border">
              {/* Collapsible Header */}
              <div 
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-t-xl"
                onClick={() => toggleBesaExpansion(besa.id)}
              >
                <div className="flex items-center space-x-3">
                  {expandedBesas.has(besa.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{besa.name}</h3>
                    <p className="text-sm text-gray-500">{besa.email}</p>
                  </div>
                </div>
                {expandedBesas.has(besa.id) && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (editingOfficeHours === besa.id) {
                        await saveOfficeHoursChanges(besa);
                        setEditingOfficeHours(null);
                      } else {
                        setEditingOfficeHours(besa.id);
                      }
                    }}
                    className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium">
                    <Edit3 className="h-3 w-3" />
                    <span>{editingOfficeHours === besa.id ? 'Cancel' : 'Edit'}</span>
                  </button>
                )}
              </div>

              {/* Expandable Content */}
              {expandedBesas.has(besa.id) && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="space-y-3 mt-4">
                    {orderedDays.map((day) => {
                      const hours = besa.officeHours[day] || { available: false, timeSlots: [] };
                      return (
                        <div key={day} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{dayNames[day as keyof typeof dayNames]}</span>
                            {editingOfficeHours === besa.id && (
                              <input
                                type="checkbox"
                                checked={hours.available}
                                onChange={(e) => updateBesaAvailability(besa.id, day, e.target.checked)}
                                className="h-4 w-4 text-blue-600"
                              />
                            )}
                          </div>
                          
                          {hours.available ? (
                            <div className="space-y-2">
                              {hours.timeSlots.map((slot) => (
                                <div key={slot.id} className="flex items-center space-x-2">
                                  {editingOfficeHours === besa.id ? (
                                    <>
                                      <input
                                        type="time"
                                        value={slot.start}
                                        onChange={(e) => updateTimeSlot(besa.id, day, slot.id, 'start', e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                                      />
                                      <span className="text-xs text-gray-500">to</span>
                                      <input
                                        type="time"
                                        value={slot.end}
                                        onChange={(e) => updateTimeSlot(besa.id, day, slot.id, 'end', e.target.value)}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs flex-1"
                                      />
                                      {hours.timeSlots.length > 1 && (
                                        <button
                                          onClick={() => removeTimeSlot(besa.id, day, slot.id)}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-600 flex-1">
                                      {formatTime12Hour(slot.start)} - {formatTime12Hour(slot.end)}
                                    </span>
                                  )}
                                </div>
                              ))}
                              
                              {editingOfficeHours === besa.id && hours.available && (
                                <button
                                  onClick={() => addTimeSlot(besa.id, day)}
                                  className="flex items-center space-x-1 text-blue-600 hover:bg-blue-50 rounded px-2 py-1 text-xs">
                                  <Plus className="h-3 w-3" />
                                  <span>Add Time Slot</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            !editingOfficeHours && (
                              <span className="text-sm text-gray-500">Unavailable</span>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {editingOfficeHours === besa.id && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={async () => {
                          const besaToSave = besas.find(b => b.id === editingOfficeHours);
                          if (!besaToSave) return;

                          try {
                            const besaDocRef = doc(db, 'Besas', besaToSave.id);
                            await updateDoc(besaDocRef, {
                              officeHours: besaToSave.officeHours,
                            });
                            setEditingOfficeHours(null); 
                          } catch (error) {
                            console.error('Failed to save office hours:', error);
                            alert('Failed to save changes. Please try again.');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-1">
                        <Save className="h-3 w-3" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Compiled Schedule */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Compiled Office Hours</h2>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Availability</h3>
            <div className="space-y-4">
              {orderedDays.map((day) => {
                const daySchedule = compiledSchedule[day];
                return (
                  <div key={day} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="mb-2">
                      <span className="font-medium text-gray-900">{dayNames[day as keyof typeof dayNames]}</span>
                    </div>
                    {daySchedule && daySchedule.timeSlots.length > 0 ? (
                      <div className="space-y-2">
                        {daySchedule.timeSlots.map((slot, index) => (
                          <div key={index} className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-green-600">
                              {formatTime12Hour(slot.start)} - {formatTime12Hour(slot.end)}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <div className="flex flex-wrap gap-1">
                              {slot.besas.map((besaName, besaIndex) => (
                                <span key={besaIndex} className="text-sm text-green-600 font-medium">
                                  {besaName}
                                  {besaIndex < slot.besas.length - 1 && <span className="text-gray-400">, </span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.keys(compiledSchedule).length}
                </div>
                <div className="text-sm text-gray-600">Days Covered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {besas.filter(b => b.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active BESAs</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
