import type { Request, Response } from "express";
import { adminService } from "../services/admin.service.js";
import { settingsService } from "../services/settings.service.js";
import { getRouteParam } from "../utils/request.js";

export async function getDashboardData(_req: Request, res: Response) {
  const dashboard = await adminService.getDashboardData();
  res.json(dashboard);
}

export async function getScheduleData(_req: Request, res: Response) {
  const schedule = await adminService.getScheduleData();
  res.json(schedule);
}

export async function getBesaManagementData(_req: Request, res: Response) {
  const data = await adminService.getBesaManagementData();
  res.json(data);
}

export async function getOfficeHoursData(_req: Request, res: Response) {
  const data = await adminService.getOfficeHoursData();
  res.json(data);
}

export async function updateDashboardBooking(req: Request, res: Response) {
  const updated = await adminService.updateDashboardBooking(getRouteParam(req.params.bookingId), req.body);
  res.json(updated);
}

export async function getDashboardAssignments(req: Request, res: Response) {
  const assignments = await adminService.getDashboardAssignments(req.body);
  res.json(assignments);
}

export async function deleteDashboardBooking(req: Request, res: Response) {
  await adminService.deleteDashboardBooking(getRouteParam(req.params.bookingId));
  res.status(204).send();
}

export async function updateSettingsPassword(req: Request, res: Response) {
  const result = await settingsService.updatePassword(req.body);
  res.json(result);
}
