import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ID format",
  });

export const createReportSchema = z
  .object({
    reportedUserId: objectIdSchema.optional(),
    reportedPostId: objectIdSchema.optional(),
    reason: z.enum([
      "spam",
      "harassment",
      "hate_speech",
      "inappropriate",
      "violence",
      "other",
    ]),
    details: z.string().max(500).optional(),
  })
  .refine((data) => data.reportedUserId || data.reportedPostId, {
    message: "Either reportedUserId or reportedPostId must be provided",
  });
