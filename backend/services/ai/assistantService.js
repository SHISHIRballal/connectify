import { getAIProvider } from "./aiProvider.js";
import ApiError from "../../utils/ApiError.js";
import env from "../../config/env.js";

// Safety and Context Window Limits
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 6;
const MAX_TOTAL_HISTORY_CHARS = 4000;
const ALLOWED_MODES = ["general", "improve", "draft", "summarize", "trends", "features"];

/**
 * Sanitize and bound conversation history turns
 *
 * @param {Array} history - Raw history turns [{ role, content }]
 * @returns {Array} Bounded history turns safe for AI consumption
 */
const sanitizeAndBoundHistory = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  // Keep only the most recent N messages (sliding window)
  const recentTurns = history.slice(-MAX_HISTORY_MESSAGES);
  const validTurns = [];
  let totalChars = 0;

  for (const turn of recentTurns) {
    if (!turn || typeof turn !== "object") continue;

    const role = turn.role === "assistant" ? "assistant" : "user";
    const content = typeof turn.content === "string" ? turn.content.trim() : "";

    if (!content) continue;

    // Check total character budget
    if (totalChars + content.length > MAX_TOTAL_HISTORY_CHARS) {
      const remainingBudget = Math.max(0, MAX_TOTAL_HISTORY_CHARS - totalChars);
      if (remainingBudget > 50) {
        validTurns.push({
          role,
          content: content.slice(0, remainingBudget) + "...",
        });
      }
      break;
    }

    validTurns.push({ role, content });
    totalChars += content.length;
  }

  return validTurns;
};

/**
 * Process an AI Assistant chat message with context window bounding and safety validation
 *
 * @param {Object} params
 * @param {string} params.message - User prompt / message
 * @param {Array} [params.history] - Optional conversation history
 * @param {string} [params.mode] - Optional assistant mode ("general" | "improve" | "draft" | "summarize" | "trends" | "features")
 * @param {Object} params.user - Authenticated user context
 * @returns {Promise<Object>} { reply, mode, provider, timestamp }
 */
export const processChatMessage = async ({ message, history = [], mode = "general", user }) => {
  // 1. Validate user message
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new ApiError(400, "Message cannot be empty");
  }

  const cleanMessage = message.trim();
  if (cleanMessage.length > MAX_MESSAGE_CHARS) {
    throw new ApiError(
      400,
      `Message length (${cleanMessage.length} characters) exceeds the maximum allowed limit of ${MAX_MESSAGE_CHARS} characters`
    );
  }

  // 2. Validate and normalize mode
  const normalizedMode = ALLOWED_MODES.includes(mode?.toLowerCase())
    ? mode.toLowerCase()
    : "general";

  // 3. Bound conversation history to prevent payload abuse or unbounded token usage
  const boundedHistory = sanitizeAndBoundHistory(history);

  // 4. Delegate to Provider with timeout handling
  try {
    const provider = getAIProvider();
    const result = await provider.chatWithAssistant(cleanMessage, {
      history: boundedHistory,
      mode: normalizedMode,
      user: {
        username: user?.username || "user",
        fullname: user?.fullname || "User",
        role: user?.role || "USER",
      },
      timeoutMs: env.AI_TIMEOUT_MS || 5000,
    });

    return {
      reply: result.reply,
      mode: result.mode || normalizedMode,
      provider: result.provider,
      timestamp: new Date(),
    };
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError(504, "AI Assistant request timed out. Please try again.");
    }

    console.error("[AI Assistant Error]:", err.message);
    throw new ApiError(
      503,
      "AI Assistant is temporarily unavailable. Please try again in a few moments."
    );
  }
};
