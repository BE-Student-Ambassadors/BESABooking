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

    type WeeklySlot = { start: string; end: string };
    type WeeklyHours = Record<string, WeeklySlot[]>;
    type AvailabilityRange = {
        startDate: string;
        endDate: string;
        weeklyHours: WeeklyHours;
    };


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
        bookingNotice?: string; // Tour-specific message shown before selecting a booking date
        bannerImageUrl?: string; // Optional banner shown when this tour is selected
        maxBookings: number; // Maximum number of bookings allowed per session
        location: string; // Physical location or 'Online'
        calendarInviteLocation?: string; // Optional location shown on the calendar invite
        zoomLink: string; // Zoom link if applicable
        autoGenerateZoom: boolean;
        calendarInviteDetails?: string; // Optional custom details shown on the calendar invite

        // Availability
        weeklyHours: WeeklyHours; // Legacy/default weekly recurring hours
        availabilityRanges?: AvailabilityRange[]; // Date ranges with their own recurring hours
        allowConcurrentTours?: boolean; // Allows overlaps only with other tours that also enable it
        googleCalendarId?: string; // Google Calendar destination for bookings from this tour
        // Example: { monday: [{ start: '09:00', end: '17:00' }], tuesday: [...] }  

        // Date-Specific Availability
        // Example: [{ date: '2023-12-25', slots: [{ start: '10:00', end: '12:00' }], unavailable: false }]
        // If 'unavailable' is true, the date is blocked regardless of slots
        dateSpecificBlockDays: Array<{ 
            startDate: string;
            endDate?: string;
            slots: { start: string; end: string }[];
            blockedTimes?: string[];
            blockedRanges?: { start: string; end: string }[];
            unavailable: boolean;
            appliesToAllTours?: boolean;
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
        applyToAllTours?: boolean; // Whether recurrence applies to all dates

        // Scheduling Rules
        minNotice: number; // Minimum time required
        minNoticeUnit: 'hours' | 'days' | 'weeks'; // Unit for minNotice
        maxNotice: number; // Maximum time in advance (3 months, 6 months, 1 year)
        maxNoticeUnit: 'days' | 'weeks' | 'months'; // Unit for maxNotice
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
            largeTourDetailsEnabled?: boolean;
            largeTourDetailsLabel?: string;
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
        displayOrder?: number; // Optional ordering index for dashboard display
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
        supportedTourIds?: string[];
        officeHours: {
            [day: string]: DayHours;
        };
    }

    interface BesaAssignment {
        name: string;
        email: string;
    }

    interface BookingData {
        bookingId: string; // specific ID for each booking
        tourId?: string; // gets tour name for display purposes
        timeSlot?: string,
        groupSize?: number,
        tourType?: string;
        status?: string,
        date: string;
        startTime: string;
        endTime: string;
        time?: string;
        attendees: number;
        maxAttendees: number;
        besas: Array<BesaAssignment | string>;
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        organization?: string;
        role?: string;
        accommodations?: string;
        interests: string[];
        leadGuide?: string,
        notes?: string,
        modificationReason?: string,
        largeTourDetails?: string;
    }
    


    type Besa = {
      id: string;
      name: string;
      email: string;
      status: string;
      role: string;
      supportedTourIds?: string[];
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
    type DateSpecificSlot = { start: string; end: string };
    type DateSpecificHours = { date: string; unavailable?: boolean; slots: DateSpecificSlot[] };
    

}
