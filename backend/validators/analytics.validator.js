import { z } from "zod";

export const analyticsQuerySchema = z.object({
  timeframe: z.enum(["7d", "30d", "90d", "all", ""]).optional().default("7d"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
