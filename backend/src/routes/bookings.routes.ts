import { Router } from "express";
import {
  cancelBooking,
  createBooking,
  getAvailability,
  getBookingByReference,
  rescheduleBooking,
} from "../controllers/bookings.controller.js";

export const bookingsRouter = Router();

bookingsRouter.get("/lookup", getBookingByReference);
bookingsRouter.get("/availability", getAvailability);
bookingsRouter.post("/", createBooking);
bookingsRouter.patch("/:bookingId/reschedule", rescheduleBooking);
bookingsRouter.delete("/:bookingId", cancelBooking);
