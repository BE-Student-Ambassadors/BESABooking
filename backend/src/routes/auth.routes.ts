import { Router } from "express";
import { verifySession } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.get("/session", verifySession);
