import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.js";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // AppErrors are expected (bad input, slot taken, not found); pass their message along
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  res.status(500).json({
    message: "Internal server error",
  });
}
