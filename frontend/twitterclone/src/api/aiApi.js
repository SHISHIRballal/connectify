import { apiClient } from "./apiClient";

export const aiApi = {
  /**
   * Summarize a set of posts or a thread
   * @param {string[]} postIds - Array of post IDs to summarize
   * @returns {Promise<Object>} { summary, postCount, truncated, provider }
   */
  summarize: (postIds) =>
    apiClient("/api/ai/summarize", {
      method: "POST",
      body: { postIds },
    }),

  /**
   * Send a chat message to the Connectify AI Assistant
   * @param {Object} params
   * @param {string} params.message - User prompt
   * @param {Array} [params.history] - Conversation history turns
   * @param {string} [params.mode] - Assistant mode ("general" | "improve" | "draft" | "summarize" | "trends" | "features")
   * @returns {Promise<Object>} { reply, mode, provider, timestamp }
   */
  chat: ({ message, history = [], mode = "general" }) =>
    apiClient("/api/ai/chat", {
      method: "POST",
      body: { message, history, mode },
    }),
};
