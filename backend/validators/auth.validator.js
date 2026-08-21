import { z } from "zod";

export const signupSchema = z.object({
  fullname: z
    .string()
    .min(1, "Full name is required")
    .max(50, "Full name must be 50 characters or less"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(30, "Username must be 30 characters or less")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
