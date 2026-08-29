import { createApp } from "../backend/src/app.js";

// Vercel invokes the Express app as a serverless function for every /api/* route.
export default createApp();
