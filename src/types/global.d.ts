export {};

declare global {
//Tour Type     
    
    type editingTour = "true" | "false";

    type UserRole = 'public' | 'admin';
    interface TimeSlot {
        start: string;
        end: string;
        id: string;
    }


    type Tour = {
        tourId: string; // Unique identifier

        // Basic Info
        title: string; // Name of the tour
        description: string; // Detailed description
        duration: number; // Duration in hours/minutes
        startDate?: string; // Optional start date
        endDate?: string; // Optional end date
        durationUnit: 'minutes' | 'hours' | 'hour'; // Unit for duration
        maxAttendeesPerBooking: number; // Maximum number of attendees per booking
        maxBookings: number; // Maximum number of bookings allowed per session
        location: string; // Physical location or 'Online'
        zoomLink: string; // Zoom link if applicable
        autoGenerateZoom: boolean;

        // Availability
        weeklyHours: {[key: string]: { start: string; end: string }[];}; // Weekly recurring hours
        // Example: { monday: [{ start: '09:00', end: '17:00' }], tuesday: [...] }  

        // Date-Specific Availability
        // Example: [{ date: '2023-12-25', slots: [{ start: '10:00', end: '12:00' }], unavailable: false }]
        // If 'unavailable' is true, the date is blocked regardless of slots
        dateSpecificBlockDays: Array<{ 
            date: string;
            slots: { start: string; end: string }[];
            unavailable: boolean;
        }>;

        // Date Ranges when the tour is available   
        // Example: [{ startDate: '2025-09-25', endDate: '2025-12-09', notes: 'Fall Quarter' }]
        dateSpecificDays: Array<{
            startDate: string;   
            endDate: string;     
            notes?: string;  
        }>;

        // Recurrence
        frequency: number; // e.g., every 1 hour
        frequencyUnit: 'minutes' | 'hours' | 'hour'; // Unit for frequency;

        // Scheduling Rules
        registrationLimit: number; // Max Bookings allowed
        minNotice: number; // Minimum time required
        minNoticeUnit: 'hours' | 'days' | 'weeks'; // Unit for minNotice
        maxNotice: number; // Maximum time in advance (3 months, 6 months, 1 year)
        maxNoticeUnit: 'days' | 'weeks' | 'months'; // Unit for maxNotice
        bufferTime: number; // Buffer time between bookings (slugworks 20min)
        bufferUnit: 'minutes' | 'hours' | 'hour'; // Unit for bufferTime
        cancellationPolicy: string; // Cancellation policy details
        reschedulingPolicy: string; // Rescheduling policy details

        // Intake Form
        intakeForm: {
            firstName: boolean;
            lastName: boolean;
            email: boolean;
            phone: boolean;
            attendeeCount: boolean;
            majorsInterested: boolean;
            // Add other standard fields as needed
            customQuestions: Array<{
            question: string;
            type: 'text' | 'textarea' | 'select' | 'checkbox';
            required: boolean;
            options?: string[];
            }>;
        };

        // Notifications
        reminderEmails: Array<{
            timing: number;
            unit: 'hours' | 'days' | 'weeks';
        }>;
        sessionInstructions: string;

        // Status
        published: boolean;
        createdAt?: string;
    };

// Tour Booking
    interface DayHours {
        available: boolean;
        timeSlots: TimeSlot[];
    }
    type TimeSlot = {
        id: string;
        start: string;
        end: string;
    };
    
    type OfficeHours = {
        available: boolean;
        timeSlots: TimeSlot[];
    };

    interface BesaData {
        id: string;
        name: string;
        email: string;
        status: string;
        role: string;
        officeHours: {
            [day: string]: DayHours;
        };
    }

    interface BookingData {
        tourId?: string;
        timeSlot?: string,
        groupSize?: number,
        tourType?: string;
        status?: string,
        date: string;
        time: string;
        attendees: number;
        maxAttendees: number;
        besas: string[];
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        organization?: string;
        role?: string;
        interests: string[];
        leadGuide?: string,
        notes?: string,
    }
    


    type Besa = {
      id: string;
      name: string;
      email: string;
      status: string;
      role: string;
      officeHours: {
        monday: OfficeHours;
        tuesday: OfficeHours;
        wednesday: OfficeHours;
        thursday: OfficeHours;
        friday: OfficeHours;
        saturday: OfficeHours;
        sunday: OfficeHours;
      };
    };

    type UserRole = 'public' | 'admin';
    type WeeklySlot = { start: string; end: string };
    type WeeklyHours = Record<string, WeeklySlot[]>;
    type DateSpecificSlot = { start: string; end: string };
    type DateSpecificHours = { date: string; unavailable?: boolean; slots: DateSpecificSlot[] };
    

}