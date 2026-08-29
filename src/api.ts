import axios from 'axios';
import { auth } from './firebaseAuth.ts';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';

const api = axios.create({
    // Production uses the Vercel function on this same domain. Set this only
    // when intentionally using a separately hosted API.
    baseURL: import.meta.env.VITE_API_BASE_URL ?? ""
})

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    config.headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  return config;
});

export interface TimeSlotOption {
  time: string;
  remainingSpots: number;
}

export interface AvailabilityResponse {
  tourId: string;
  date?: string;
  available: boolean;
  reason?: string;
  times: TimeSlotOption[];
  dates?: Record<string, boolean>;
}

export interface BookingCreatePayload {
  tourId: string;
  date: string;
  startTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  maxAttendees: number;
  interests: string[];
  accommodations?: string;
  largeTourDetails?: string;
  notes?: string;
}

export interface BookingResponse {
  bookingId: string;
  tourId: string;
  tourType: string;
  date: string;
  startTime: string;
  endTime: string;
  startTimeISO: string;
  endTimeISO: string;
  maxAttendees: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  interests: string[];
  accommodations?: string;
  largeTourDetails?: string;
  location?: string;
  besas: { name: string; email: string }[];
  calendarEventId?: string;
  createdAt: string;
}

export const getAvailability = async (
  tourId: string,
  date: string
): Promise<AvailabilityResponse> => {
  const { data } = await api.get<AvailabilityResponse>('/api/bookings/availability', {
    params: { tourId, date },
  });
  return data;
};

export const getAvailabilityRange = async (
  tourId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<AvailabilityResponse> => {
  const { data } = await api.get<AvailabilityResponse>('/api/bookings/availability', {
    params: { tourId, rangeStart, rangeEnd },
  });
  return data;
};

export const createBooking = async (
  payload: BookingCreatePayload
): Promise<BookingResponse> => {
  const { data } = await api.post<BookingResponse>('/api/bookings/', payload);
  return data;
};

export default api;
