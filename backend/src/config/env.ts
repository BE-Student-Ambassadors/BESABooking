import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  FIREBASE_WEB_API_KEY: z.string().default(""),
  // Used until the list is first saved from the Office Hours page (Settings/officeHoursCalendars).
  // Keep in sync with OFFICE_HOURS_CALENDAR_IDS in the Firebase Functions .env.
  OFFICE_HOURS_CALENDAR_IDS: z.string().default(
    "c_f3f671e4693681861ed06c54d8f89c2003f4ef4a2040462c4aad1679414fd486@group.calendar.google.com," +
      "c_7afaa3252234ca338df525675a5df209e8117fcd6f6093a3daac9f54f16671ce@group.calendar.google.com," +
      "primary",
  ),
});

export const env = envSchema.parse(process.env);
