import type { Request, Response } from "express";
import { besasService } from "../services/besas.service.js";

export async function listBesas(_req: Request, res: Response) {
  const besas = await besasService.listBesas();
  res.json(besas);
}

export async function createBesa(req: Request, res: Response) {
  const created = await besasService.createBesa(req.body);
  res.status(201).json(created);
}

export async function updateBesa(req: Request, res: Response) {
  const updated = await besasService.updateBesa(req.params.besaId, req.body);
  res.json(updated);
}

export async function updateOfficeHours(req: Request, res: Response) {
  const updated = await besasService.updateOfficeHours(req.params.besaId, req.body);
  res.json(updated);
}
