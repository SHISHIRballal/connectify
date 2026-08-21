import { getAIProvider } from "./aiProvider.js";
import Post from "../../model/post.model.js";
import ApiError from "../../utils/ApiError.js";
import env from "../../config/env.js";

// Configuration
const MAX_INPUT_CHARS = 10000;
const MAX_POST_IDS = 50;

/**
 * Sanitize user-generated post text for AI consumption.
 * Strips URLs, excessive whitespace, and special characters to limit unnecessary data.
 */
const sanitizeForAI = (text = "") => {
  return text
    .replace(/https?:\/\/\S+/gi, "[link]") // replace URLs with placeholder
    .replace(/<[^>]*>/g, "")                // strip HTML tags
    .replace(/\s+/g, " ")                   // collapse whitespace
    .trim();
};

/**
 * Summarize a thread or a set of selected posts.
 *
 * @param {Object} params
 * @param {string[]} params.postIds - Array of post IDs to summarize
 * @param {string} params.userId - Requesting user's ID
 * @returns {Promise<Object>} { summary, postCount, truncated, provider }
 */
export const summarizePosts = async ({ postIds, userId }) => {
  // 1. Validate post IDs input
  if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
    throw new ApiError(400, "At least one post ID is required for summarization");
  }

  if (postIds.length > MAX_POST_IDS) {
    throw new ApiError(400, `Maximum of ${MAX_POST_IDS} posts can be summarized at once`);
  }

  // 2. Fetch and validate posts from MongoDB with populated author and comments
  const posts = await Post.find({ _id: { $in: postIds } })
    .select("text user comments createdAt")
    .populate("user", "username fullname")
    .populate("comments.user", "username fullname")
    .sort({ createdAt: 1 })
    .lean();

  if (posts.length === 0) {
    throw new ApiError(404, "No valid posts found for the provided IDs");
  }

  // 3. Assemble and sanitize content — send only necessary text data
  const assembledParts = posts.map((post) => {
    const authorName = post.user?.fullname || post.user?.username || "User";
    const sanitizedText = sanitizeForAI(post.text || "");
    let postBlock = `Post by @${authorName}: "${sanitizedText}"`;

    if (post.comments && post.comments.length > 0) {
      const topComments = post.comments.slice(0, 5).map((c) => {
        const cAuthor = c.user?.fullname || c.user?.username || "User";
        return `  - Reply from @${cAuthor}: "${sanitizeForAI(c.text || "")}"`;
      }).join("\n");
      postBlock += `\nReplies/Comments:\n${topComments}`;
    }

    return postBlock;
  });

  let assembledText = assembledParts.join("\n\n");
  let truncated = false;

  // 4. Enforce maximum input length
  if (assembledText.length > MAX_INPUT_CHARS) {
    assembledText = assembledText.slice(0, MAX_INPUT_CHARS);
    truncated = true;
  }

  // 5. Execute summarization via AI provider
  try {
    const provider = getAIProvider();
    const result = await provider.summarizeText(assembledText, {
      timeoutMs: env.AI_TIMEOUT_MS || 5000,
    });

    return {
      summary: result.summary,
      postCount: posts.length,
      truncated,
      provider: result.provider,
    };
  } catch (err) {
    // Differentiate timeout vs general failures
    if (err.name === "AbortError") {
      throw new ApiError(504, "AI summarization request timed out. Please try again.");
    }

    console.error("[Summarization Service] Provider error:", err.message);
    throw new ApiError(
      503,
      "AI summarization service is temporarily unavailable. Please try again later."
    );
  }
};
