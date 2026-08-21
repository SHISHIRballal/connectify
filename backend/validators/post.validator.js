import { z } from "zod";

export const createPostSchema = z
  .object({
    text: z.string().max(1000, "Post text cannot exceed 1000 characters").optional(),
    img: z.string().optional(),
  })
  .refine((data) => (data.text && data.text.trim().length > 0) || (data.img && data.img.trim().length > 0), {
    message: "Post must contain either text or an image",
  });

export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1, "Limit must be at least 1").max(50, "Limit cannot exceed 50")),
});

export const commentSchema = z.object({
  text: z
    .string({
      required_error: "Comment text is required",
    })
    .trim()
    .min(1, "Comment cannot be empty")
    .max(500, "Comment cannot exceed 500 characters"),
});

export const postIdParamSchema = z.object({
  id: z
    .string({
      required_error: "Post ID parameter is required",
    })
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid post ID format"),
});
