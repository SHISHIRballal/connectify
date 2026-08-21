import { summarizePosts } from "../services/ai/summarizationService.js";
import { processChatMessage } from "../services/ai/assistantService.js";
import ApiError from "../utils/ApiError.js";

/**
 * POST /api/ai/summarize
 * Summarize a set of posts or a thread
 */
export const handleSummarize = async (req, res, next) => {
  try {
    const { postIds } = req.body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      throw new ApiError(400, "Request body must include a non-empty 'postIds' array");
    }

    const result = await summarizePosts({
      postIds,
      userId: req.user._id.toString(),
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/ai/chat
 * Interactive AI Assistant chat supporting post drafting, improvements, summarization, trends, and feature help
 */
export const handleChat = async (req, res, next) => {
  try {
    const { message, history, mode } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      throw new ApiError(400, "Request body must include a non-empty 'message' string");
    }

    const result = await processChatMessage({
      message,
      history,
      mode,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
