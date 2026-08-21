import { z } from "zod";

export const sendMessageSchema = z.object({
  message: z
    .string({
      required_error: "Message is required",
    })
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
});

export const messageParamsSchema = z.object({
  id: z
    .string({
      required_error: "User ID parameter is required",
    })
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
});
