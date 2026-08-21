import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ID format",
  });

export const adminUserIdParamSchema = z.object({
  id: objectIdSchema,
});

export const adminReportIdParamSchema = z.object({
  id: objectIdSchema,
});

export const adminPostIdParamSchema = z.object({
  id: objectIdSchema,
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["USER", "MODERATOR", "ADMIN", "user", "moderator", "admin", ""]).optional(),
  status: z.enum(["active", "suspended", "ACTIVE", "SUSPENDED", ""]).optional(),
});

export const adminPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  search: z.string().optional(),
  hasReports: z.coerce.boolean().optional(),
});

export const suspendUserSchema = z.object({
  reason: z.string().max(200).optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(["USER", "MODERATOR", "ADMIN", "user", "moderator", "admin"]),
});

export const adminReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "RESOLVED", "DISMISSED", "pending", "resolved", "dismissed", ""]).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED", "resolved", "dismissed"]).default("RESOLVED"),
  resolutionNotes: z.string().max(500).optional(),
  actionTaken: z.enum(["NONE", "POST_DELETED", "USER_SUSPENDED", "DISMISSED"]).default("NONE"),
});
