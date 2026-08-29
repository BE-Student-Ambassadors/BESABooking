import type { Express } from "express";
import { authRouter } from "./auth.routes.js";
import { besasRouter } from "./besas.routes.js";
import { bookingsRouter } from "./bookings.routes.js";
import { toursRouter } from "./tours.routes.js";

export function registerRoutes(app: Express) {
  app.use("/api/auth", authRouter);
  app.use("/api/bookings", bookingsRouter);
  app.use("/api/tours", toursRouter);
  app.use("/api/besas", besasRouter);
}
