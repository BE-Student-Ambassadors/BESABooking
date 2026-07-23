import { Router } from "express";
import {
  createTour,
  deleteTour,
  listTours,
  toggleTourPublishState,
  updateTour,
} from "../controllers/tours.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

export const toursRouter = Router();

toursRouter.get("/", listTours);
toursRouter.post("/", requireAdmin, createTour);
toursRouter.patch("/:tourId", requireAdmin, updateTour);
toursRouter.patch("/:tourId/publish", requireAdmin, toggleTourPublishState);
toursRouter.delete("/:tourId", requireAdmin, deleteTour);
