import { z } from "zod";

export const bookingSchema = z.object({
  tourId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
});
