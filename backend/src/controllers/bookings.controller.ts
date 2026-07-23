import type { Request, Response } from "express";
import { availabilityService } from "../services/availability.service.js";
import { bookingService } from "../services/bookings.service.js";

export async function getBookingByReference(req: Request, res: Response) {
  const booking = await bookingService.getBookingByReference(req.query);
  res.json(booking);
}

export async function getAvailability(req: Request, res: Response) {
  const availability = await availabilityService.getAvailability(req.query);
  res.json(availability);
}

export async function createBooking(req: Request, res: Response) {
  const created = await bookingService.createBooking(req.body);
  res.status(201).json(created);
}

export async function rescheduleBooking(req: Request, res: Response) {
  const updated = await bookingService.rescheduleBooking(req.params.bookingId, req.body);
  res.json(updated);
}

export async function cancelBooking(req: Request, res: Response) {
  await bookingService.cancelBooking(req.params.bookingId);
  res.status(204).send();
}
