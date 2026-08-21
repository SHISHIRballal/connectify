import { z } from "zod";

export const updateProfileSchema = z
  .object({
    username: z
      .string()
      .min(1)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/)
      .optional(),
    fullname: z.string().min(1).max(50).optional(),
    email: z.string().email().optional(),
    currentPassword: z.string().min(6).optional(),
    newPassword: z.string().min(6).optional(),
    bio: z.string().max(160).optional(),
    link: z.string().max(200).optional(),
    profileimg: z.string().optional(),
    coverimg: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.currentPassword && !data.newPassword) return false;
      if (!data.currentPassword && data.newPassword) return false;
      return true;
    },
    {
      message:
        "Both current and new passwords are required to update password",
    },
  );

export const followParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
});

export const profileParamsSchema = z.object({
  username: z.string().min(1, "Username is required"),
});
