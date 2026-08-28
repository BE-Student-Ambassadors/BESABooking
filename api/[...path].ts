import { createApp } from "../backend/src/app.js";

// Vercel invokes this catch-all function for every /api/* request.
const app = createApp();

export default app;
