import { Router } from "express";
import {
  createBesa,
  deleteBesa,
  listBesas,
  updateBesa,
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
besasRouter.delete("/:besaId", requireAdmin, deleteBesa);
