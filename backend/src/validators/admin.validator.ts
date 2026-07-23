import { z } from "zod";

export const adminIdParamSchema = z.object({
  id: z.string().min(1),
});
