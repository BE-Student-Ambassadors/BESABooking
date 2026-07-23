import type { Request, Response } from "express";
import { toursService } from "../services/tours.service.js";

export async function listTours(_req: Request, res: Response) {
  const tours = await toursService.listTours();
  res.json(tours);
}

export async function createTour(req: Request, res: Response) {
  const created = await toursService.createTour(req.body);
  res.status(201).json(created);
}

export async function updateTour(req: Request, res: Response) {
  const updated = await toursService.updateTour(req.params.tourId, req.body);
  res.json(updated);
}

export async function toggleTourPublishState(req: Request, res: Response) {
  const updated = await toursService.togglePublishState(req.params.tourId);
  res.json(updated);
}

export async function deleteTour(req: Request, res: Response) {
  await toursService.deleteTour(req.params.tourId);
  res.status(204).send();
}
