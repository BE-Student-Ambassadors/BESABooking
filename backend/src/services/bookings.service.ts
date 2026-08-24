import { bookingsRepository } from "../repositories/bookings.repository.js";
import { toursRepository } from "../repositories/tours.repository.js";
import { assignmentService } from "./assignment.service.js";
import { availabilityService } from "./availability.service.js";

export const bookingService = {
  async getBookingByReference(query: unknown) {
    return bookingsRepository.findByReference(query);
  },

  async createBooking(payload: unknown) {
    const tour = await toursRepository.getByIdFromPayload(payload);
    await availabilityService.assertBookingAllowed(payload, tour);
    const besas = await assignmentService.assignBesas(payload, tour);
    return bookingsRepository.create({
      payload,
      besas,
      tour,
    });
  },

  async rescheduleBooking(bookingId: string, payload: Partial<BookingData>) {
    const existing = await bookingsRepository.getById(bookingId);
    if (!existing.tourId) {
      throw new Error("Booking is missing a tourId; cannot reschedule.");
    }
    const tour = await toursRepository.getById(existing.tourId);
    await availabilityService.assertRescheduleAllowed(existing, payload, tour);
    const besas = await assignmentService.assignBesas(payload, tour);
    return bookingsRepository.reschedule(bookingId, payload, besas);
  },

  async cancelBooking(bookingId: string) {
    await bookingsRepository.cancel(bookingId);
  },
};
