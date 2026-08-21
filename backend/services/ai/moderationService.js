import { getAIProvider } from "./aiProvider.js";
import { evaluatePolicy, fallbackHeuristicScanner } from "./policyEngine.js";
import env from "../../config/env.js";

/**
 * Moderate post text and attachments using AI provider and deterministic policy layer
 *
 * @param {string} text - Post content text
 * @param {string} [imgUrl] - Optional attachment URL
 * @returns {Promise<Object>} Moderation result: { moderationStatus, moderationScore, moderationCategories, moderationReason, moderatedAt, policyOutcome }
 */
export const moderatePostContent = async (text = "", imgUrl = "") => {
  const content = (text || "").trim();

  // If content is empty (e.g. image-only post), return safe default
  if (!content) {
    return {
      moderationStatus: "SAFE",
      moderationScore: 0.0,
      moderationCategories: [],
      moderationReason: "Image-only post without text",
      moderatedAt: new Date(),
    };
  }

  // Handle excessive input
  if (content.length > 2000) {
    return {
      moderationStatus: "BLOCKED",
      moderationScore: 1.0,
      moderationCategories: ["excessive_length"],
      moderationReason: "Post content exceeds maximum allowable safety analysis length",
      moderatedAt: new Date(),
    };
  }

  let aiResult = null;

  try {
    const aiProvider = getAIProvider();
    aiResult = await aiProvider.moderateText(content, {
      timeoutMs: env.AI_TIMEOUT_MS || 5000,
    });
  } catch (err) {
    console.warn(
      `[AI Moderation Warning] Provider unavailable or timed out: ${err.message}. Engaging fallback safety scanner.`
    );

    // Fail-Safe Fallback Handling
    const fallbackResult = fallbackHeuristicScanner(content);
    return {
      moderationStatus: fallbackResult.status,
      moderationScore: fallbackResult.moderationScore,
      moderationCategories: fallbackResult.moderationCategories,
      moderationReason: fallbackResult.moderationReason,
      moderatedAt: new Date(),
      fallbackEngaged: true,
    };
  }

  // Pass through deterministic policy engine
  const policyOutcome = evaluatePolicy(aiResult);

  return {
    moderationStatus: policyOutcome.status,
    moderationScore: policyOutcome.moderationScore,
    moderationCategories: policyOutcome.moderationCategories,
    moderationReason: policyOutcome.moderationReason,
    moderatedAt: new Date(),
    policyTriggered: policyOutcome.policyTriggered,
  };
};
