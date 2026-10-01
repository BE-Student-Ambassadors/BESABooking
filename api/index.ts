import type { Request, Response } from "express";
import { createApp } from "../backend/src/app.js";

const app = createApp();

export default function handler(req: Request, res: Response) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.searchParams.get("__path");

  if (path) {
    url.searchParams.delete("__path");
    req.url = `/api/${path}${url.search}`;
  }

  return app(req, res);
}
