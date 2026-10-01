import { Router } from "express";
import {
  deleteDashboardBooking,
  getBesaManagementData,
  getDashboardAssignments,
  getDashboardData,
  getOfficeHoursData,
  getScheduleData,
  updateSettingsPassword,
  updateDashboardBooking,
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

export const adminRouter = Router();

adminRouter.get("/dashboard", requireAdmin, getDashboardData);
adminRouter.get("/schedule", requireAdmin, getScheduleData);
adminRouter.get("/besas", requireAdmin, getBesaManagementData);
adminRouter.get("/office-hours", requireAdmin, getOfficeHoursData);
adminRouter.post("/bookings/assignments", requireAdmin, getDashboardAssignments);
adminRouter.post("/settings/password", requireAdmin, updateSettingsPassword);
adminRouter.patch("/bookings/:bookingId", requireAdmin, updateDashboardBooking);
adminRouter.delete("/bookings/:bookingId", requireAdmin, deleteDashboardBooking);
