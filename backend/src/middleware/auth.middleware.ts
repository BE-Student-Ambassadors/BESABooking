import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { firebaseAdminApp } from "../config/firebaseAdmin.js";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ message: "Authentication is required." });
    return;
  }

  try {
    await getAuth(firebaseAdminApp).verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired authentication token." });
  }
}
