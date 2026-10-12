import { Router } from "express";
import {
  deleteDashboardBooking,
  getBesaManagementData,
  getDashboardAssignments,
  getDashboardData,
  getOfficeHoursCalendars,
  getOfficeHoursData,
  getScheduleData,
  updateSettingsPassword,
  updateDashboardBooking,
  updateOfficeHoursCalendars,
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

export const adminRouter = Router();

adminRouter.get("/dashboard", requireAdmin, getDashboardData);
adminRouter.get("/schedule", requireAdmin, getScheduleData);
adminRouter.get("/besas", requireAdmin, getBesaManagementData);
adminRouter.get("/office-hours", requireAdmin, getOfficeHoursData);
adminRouter.get("/office-hours/calendars", requireAdmin, getOfficeHoursCalendars);
adminRouter.put("/office-hours/calendars", requireAdmin, updateOfficeHoursCalendars);
adminRouter.post("/bookings/assignments", requireAdmin, getDashboardAssignments);
adminRouter.post("/settings/password", requireAdmin, updateSettingsPassword);
adminRouter.patch("/bookings/:bookingId", requireAdmin, updateDashboardBooking);
adminRouter.delete("/bookings/:bookingId", requireAdmin, deleteDashboardBooking);
