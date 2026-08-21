import express from "express";
import rateLimit from "express-rate-limit";
import { protectRoute } from "../middleware/protectroutes.js";
import { handleSummarize, handleChat } from "../controllers/ai.controller.js";

const router = express.Router();

// Rate limiter for AI Summarization
const summarizeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "AI summarization rate limit exceeded. Please wait before making another request.",
    data: null,
  },
});

// Rate limiter for AI Chat Assistant
const chatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "AI Assistant rate limit exceeded. Please wait before sending more messages.",
    data: null,
  },
});

// All AI routes require authentication
router.use(protectRoute);

// POST /api/ai/summarize
router.post("/summarize", summarizeRateLimiter, handleSummarize);

// POST /api/ai/chat
router.post("/chat", chatRateLimiter, handleChat);

export default router;
