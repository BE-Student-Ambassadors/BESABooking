import type { NextFunction, Request, Response } from "express";

export async function requireAdmin(_req: Request, _res: Response, next: NextFunction) {
  // TODO: replace with Firebase token verification or your session strategy.
  next();
}
