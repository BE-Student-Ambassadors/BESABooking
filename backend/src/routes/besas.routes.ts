import { Router } from "express";
import {
  createBesa,
  deleteBesa,
  getPermanentChangeRequest,
  listBesas,
  updateBesa,
  requestPermanentChange,
  updateOfficeHours,
  updateTempSchedule,
} from "../controllers/besas.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

export const besasRouter = Router();

besasRouter.get("/", requireAdmin, listBesas);
besasRouter.post("/", requireAdmin, createBesa);
besasRouter.patch("/:besaId", requireAdmin, updateBesa);
besasRouter.patch("/:besaId/office-hours", requireAdmin, updateOfficeHours);
besasRouter.patch("/:besaId/temp-schedule", requireAdmin, updateTempSchedule);
besasRouter.post("/:besaId/office-hours/permanent-change", requireAdmin, requestPermanentChange);
besasRouter.get("/office-hours-requests/:requestId", requireAdmin, getPermanentChangeRequest);
besasRouter.delete("/:besaId", requireAdmin, deleteBesa);
