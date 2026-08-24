import type { Request, Response } from "express";
import { besasService } from "../services/besas.service.js";
import { getRouteParam } from "../utils/request.js";

export async function listBesas(_req: Request, res: Response) {
  const besas = await besasService.listBesas();
  res.json(besas);
}

export async function createBesa(req: Request, res: Response) {
  const created = await besasService.createBesa(req.body);
  res.status(201).json(created);
}

export async function updateBesa(req: Request, res: Response) {
  const updated = await besasService.updateBesa(getRouteParam(req.params.besaId), req.body);
  res.json(updated);
}

export async function updateOfficeHours(req: Request, res: Response) {
  const updated = await besasService.updateOfficeHours(getRouteParam(req.params.besaId), req.body);
  res.json(updated);
}

export async function deleteBesa(req: Request, res: Response) {
  await besasService.deleteBesa(getRouteParam(req.params.besaId));
  res.status(204).send();
}
