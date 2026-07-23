import type { Request, Response } from "express";

export async function verifySession(_req: Request, res: Response) {
  res.status(501).json({
    message: "TODO: verify Firebase or custom admin session.",
  });
}
