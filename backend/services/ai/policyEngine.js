/**
 * Deterministic Moderation Policy Engine
 * Prevents non-deterministic AI models from executing unchecked destructive actions.
 */

export const POLICY_CONFIG = {
  LOW_RISK_THRESHOLD: 0.40,
  HIGH_RISK_THRESHOLD: 0.75,
  SEVERE_CATEGORIES: ["violence", "hate_speech", "harassment", "self_harm"],
};

/**
 * Evaluates AI analysis results against deterministic platform policies
 *
 * @param {Object} aiResult - Output from AI provider
 * @returns {Object} Deterministic moderation outcome: { status, score, categories, reason, policyTriggered }
 */
export const evaluatePolicy = (aiResult = {}) => {
  const score = Math.max(0, Math.min(1, typeof aiResult.riskScore === "number" ? aiResult.riskScore : 0));
  const categories = Array.isArray(aiResult.categories) ? aiResult.categories : [];
  const rawReason = aiResult.reason || "Content policy evaluation";

  // Check for severe category triggers
  const hasSevereCategory = categories.some((cat) =>
    POLICY_CONFIG.SEVERE_CATEGORIES.includes(cat.toLowerCase())
  );

  // 1. HIGH RISK -> BLOCKED
  if (score >= POLICY_CONFIG.HIGH_RISK_THRESHOLD || (hasSevereCategory && score >= 0.65)) {
    return {
      status: "BLOCKED",
      moderationScore: score,
      moderationCategories: categories,
      moderationReason: `[BLOCKED] High safety risk (${Math.round(score * 100)}%): ${rawReason}`,
      policyTriggered: "HIGH_RISK_THRESHOLD_VIOLATION",
      action: "BLOCK_AND_HOLD",
    };
  }

  // 2. MEDIUM RISK -> FLAGGED
  if (score >= POLICY_CONFIG.LOW_RISK_THRESHOLD || aiResult.flagged) {
    return {
      status: "FLAGGED",
      moderationScore: score,
      moderationCategories: categories.length > 0 ? categories : ["unclassified_risk"],
      moderationReason: `[FLAGGED] Moderate safety risk (${Math.round(score * 100)}%): ${rawReason}`,
      policyTriggered: "MEDIUM_RISK_FLAG_FOR_REVIEW",
      action: "PUBLISH_AND_FLAG_FOR_REVIEW",
    };
  }

  // 3. LOW RISK -> SAFE
  return {
    status: "SAFE",
    moderationScore: score,
    moderationCategories: [],
    moderationReason: "Passed automated safety screening",
    policyTriggered: "LOW_RISK_COMPLIANT",
    action: "PUBLISH",
  };
};

/**
 * Secondary heuristic fallback scanner when external AI provider is unavailable
 */
export const fallbackHeuristicScanner = (text = "") => {
  const lower = (text || "").toLowerCase();

  const emergencyBlockKeywords = [
    "violently attack",
    "bomb threat",
    "kill them all",
    "mass murder",
    "child abuse",
  ];

  for (const kw of emergencyBlockKeywords) {
    if (lower.includes(kw)) {
      return {
        status: "BLOCKED",
        moderationScore: 0.90,
        moderationCategories: ["violence"],
        moderationReason: `Emergency heuristic block: matched keyword '${kw}' (AI offline fallback)`,
        policyTriggered: "HEURISTIC_EMERGENCY_BLOCK",
        action: "BLOCK_AND_HOLD",
      };
    }
  }

  return {
    status: "SAFE",
    moderationScore: 0.10,
    moderationCategories: [],
    moderationReason: "Evaluated via fallback safety scanner (AI service unavailable)",
    policyTriggered: "HEURISTIC_FALLBACK_PASS",
    action: "PUBLISH",
  };
};
