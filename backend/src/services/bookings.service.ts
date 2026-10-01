import { bookingsRepository } from "../repositories/bookings.repository.js";
import { toursRepository } from "../repositories/tours.repository.js";
import { assignmentService } from "./assignment.service.js";
import { availabilityService } from "./availability.service.js";

type BookingLookupQuery = {
  id?: string;
  lastName?: string;
};

function getFirstString(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export const bookingService = {
  async getBookingByReference(query: unknown) {
    const input = (query ?? {}) as Record<string, unknown>;
    const lookup: BookingLookupQuery = {
      id: getFirstString(input.id),
      lastName: getFirstString(input.lastName),
    };

    return bookingsRepository.findByReference(lookup);
  },

  async createBooking(payload: unknown) {
    const tour = await toursRepository.getByIdFromPayload(payload);
    await availabilityService.assertBookingAllowed(payload, tour);
    const besas = await assignmentService.assignBesas(payload, tour);
    const booking = payload as Record<string, unknown>;
    return bookingsRepository.create({ ...booking, besas });
  },

  async rescheduleBooking(bookingId: string, payload: Partial<BookingData>) {
    const existing = await bookingsRepository.getById(bookingId);
    const tourId = existing.tourId;
    if (typeof tourId !== "string") {
      throw new Error("Booking does not have a valid tourId.");
    }

    const tour = await toursRepository.getById(tourId);
    await availabilityService.assertRescheduleAllowed(existing, payload, tour);
    const besas = await assignmentService.assignBesas(payload, tour);
    return bookingsRepository.reschedule(bookingId, payload, besas);
  },

  async cancelBooking(bookingId: string) {
    await bookingsRepository.cancel(bookingId);
  },
};
