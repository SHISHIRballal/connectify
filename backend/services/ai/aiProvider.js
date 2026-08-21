import env from "../../config/env.js";

/**
 * Deterministic Mock AI Provider for testing and offline development
 */
class MockAIProvider {
  async moderateText(text, options = {}) {
    const lower = (text || "").toLowerCase();

    // Check for High Risk / Severe Violations
    const highRiskKeywords = [
      "violently attack",
      "kill them all",
      "hate speech",
      "bomb threat",
      "terrorist attack",
      "child abuse",
      "mass murder",
      "suicide instruction",
    ];

    for (const kw of highRiskKeywords) {
      if (lower.includes(kw)) {
        return {
          riskScore: 0.95,
          categories: ["violence", "hate_speech"],
          reason: `Severe safety policy violation detected: keyword match '${kw}'`,
          flagged: true,
          provider: "mock-ai",
        };
      }
    }

    // Check for Medium Risk / Suspicious / Spam / Borderline
    const mediumRiskKeywords = [
      "free crypto",
      "click here now",
      "buy cheap followers",
      "earn 5000 daily guaranteed",
      "whatsapp +",
      "claim your prize now",
      "hot singles in your area",
      "fake news hoax",
    ];

    for (const kw of mediumRiskKeywords) {
      if (lower.includes(kw)) {
        return {
          riskScore: 0.60,
          categories: ["spam", "misleading"],
          reason: `Potential promotional spam or misleading content: keyword match '${kw}'`,
          flagged: true,
          provider: "mock-ai",
        };
      }
    }

    // Low Risk / Safe Content
    return {
      riskScore: 0.05,
      categories: [],
      reason: "Content evaluated as safe and compliant with community standards",
      flagged: false,
      provider: "mock-ai",
    };
  }

  async summarizeText(text, options = {}) {
    const clean = (text || "").trim();

    if (!clean) {
      return {
        summary: "No text content was provided to summarize.",
        provider: "mock-ai",
        tokenCount: 0,
      };
    }

    const lower = clean.toLowerCase();

    // Domain-aware intelligent synthesis for demo topics
    if (lower.includes("connectify") || lower.includes("messaging") || lower.includes("scroll")) {
      return {
        summary: "The author shares positive impressions of Connectify, highlighting its responsive real-time messaging and seamless infinite scrolling feed experience.",
        provider: "mock-ai",
        tokenCount: clean.split(/\s+/).length,
      };
    }

    if (lower.includes("crypto") || lower.includes("guaranteed") || lower.includes("tokens") || lower.includes("giveaway")) {
      return {
        summary: "The post promotes an urgent promotional campaign offering free token giveaways with high-yield return claims.",
        provider: "mock-ai",
        tokenCount: clean.split(/\s+/).length,
      };
    }

    if (lower.includes("mongodb") || lower.includes("aggregation") || lower.includes("pipeline")) {
      return {
        summary: "A technical discussion detailing the use of MongoDB aggregation pipelines for trending hashtags and multi-metric user engagement analytics.",
        provider: "mock-ai",
        tokenCount: clean.split(/\s+/).length,
      };
    }

    if (lower.includes("role") || lower.includes("rbac") || lower.includes("admin") || lower.includes("moderator")) {
      return {
        summary: "An overview of role-based access control (RBAC), explaining privilege tiers between administrators, moderators, and regular users.",
        provider: "mock-ai",
        tokenCount: clean.split(/\s+/).length,
      };
    }

    // General high-quality summarization logic
    const rawContentOnly = clean
      .replace(/Post by @[^:]+:\s*"/g, "")
      .replace(/Replies\/Comments:/g, "")
      .replace(/Reply from @[^:]+:\s*"/g, "")
      .replace(/"/g, "")
      .replace(/\[\d+\]\s*@[^:]+:\s*/g, "");

    const sentences = rawContentOnly
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    let summary = "";
    if (sentences.length >= 2) {
      summary = `${sentences[0]} Additionally, ${sentences[1].charAt(0).toLowerCase() + sentences[1].slice(1)}`;
    } else if (sentences.length === 1) {
      summary = `Key takeaway: ${sentences[0]}`;
    } else {
      summary = `Overview: ${rawContentOnly.slice(0, 150)}...`;
    }

    if (lower.includes("replies/comments") || lower.includes("comments]")) {
      summary += " The thread includes community discussion and replies.";
    }

    return {
      summary,
      provider: "mock-ai",
      tokenCount: clean.split(/\s+/).length,
    };
  }

  async chatWithAssistant(message, options = {}) {
    const clean = (message || "").trim();
    const lower = clean.toLowerCase();
    const mode = options.mode || "general";
    const username = options.user?.username || "friend";

    // 1. Tweet Improvement Mode
    if (mode === "improve" || lower.startsWith("improve") || lower.includes("make this better") || lower.includes("polish this")) {
      const topic = clean.replace(/^(improve|polish|make this tweet better:?)\s*/i, "").trim() || "Building on Connectify!";
      return {
        reply: `Here is a polished, high-engagement version of your post:\n\n"🚀 ${topic.charAt(0).toUpperCase() + topic.slice(1)} — loving the seamless experience and fast interactions on Connectify! What are you working on today? #Connectify #DevCommunity"\n\n✨ **Enhancements applied:**\n• Added an attention-grabbing opening hook\n• Included an engagement-driving community question\n• Added relevant discovery hashtags`,
        mode: "improve",
        provider: "mock-ai",
        tokenCount: clean.split(/\s+/).length + 45,
      };
    }

    // 2. Draft Generation Mode
    if (mode === "draft" || lower.startsWith("draft") || lower.startsWith("write a post") || lower.includes("generate a tweet")) {
      const topic = clean.replace(/^(draft a post about|write a post about|generate a tweet about:?)\s*/i, "").trim() || "web development";
      return {
        reply: `Here is a fresh post draft on **${topic}**:\n\n"💡 Just exploring ${topic} — the possibilities with modern full-stack architectures and real-time social platforms are limitless. Excited to share what's coming next! 🛠️\n\n#${topic.replace(/\s+/g, "")} #Connectify #Tech"`,
        mode: "draft",
        provider: "mock-ai",
        tokenCount: clean.split(/\s+/).length + 40,
      };
    }

    // 3. Summarization Mode
    if (mode === "summarize" || lower.startsWith("summarize")) {
      const textToSummarize = clean.replace(/^summarize:?\s*/i, "");
      return {
        reply: `📝 **Summary:**\n• Key Point: ${textToSummarize.slice(0, 100)}...\n• Takeaway: High-level overview condensed for quick reading.\n• Actionable insight: Ideal for sharing as a thread summary.`,
        mode: "summarize",
        provider: "mock-ai",
        tokenCount: clean.split(/\s+/).length + 30,
      };
    }

    // 4. Trend Explanation Mode
    if (mode === "trends" || lower.includes("trend") || lower.includes("what's trending") || lower.includes("popular hashtags")) {
      return {
        reply: `📈 **Current Connectify Trends & Top Topics:**\n\n1. **#connectify** — Platform updates, real-time messaging benchmarks, and social networking.\n2. **#realtime** — Discussions on Socket.IO presence, instant typing indicators, and low-latency feeds.\n3. **#ai** — Content moderation policy engines, AI summarization, and interactive assistance.\n4. **#mongodb** — Aggregation pipelines, cursor pagination indexing, and analytics telemetry.\n\n💡 *Tip: Include these hashtags in your posts to increase community reach!*`,
        mode: "trends",
        provider: "mock-ai",
        tokenCount: 65,
      };
    }

    // 5. Connectify Features Guidance Mode
    if (mode === "features" || lower.includes("feature") || lower.includes("how does connectify work") || lower.includes("what can connectify do") || lower.includes("how do i")) {
      return {
        reply: `👋 Welcome @${username}! Connectify is a full-featured real-time social platform. Here are its core capabilities:\n\n• ⚡ **Real-Time Direct Messaging**: One-to-one Socket.IO chat with live online presence dots, typing indicators, and read receipts.\n• 📜 **Infinite Scrolling Feed**: High-performance cursor-based pagination that seamlessly loads posts without feed jumping.\n• 🛡️ **AI-Powered Content Moderation**: Server-side multi-tier safety engine (🟢 SAFE, 🟡 FLAGGED for review, 🔴 BLOCKED for severe violations).\n• ✨ **AI Thread Summarizer**: One-click inline summaries on long posts and reply threads.\n• 📊 **Analytics & RBAC**: Real-time aggregation metrics, trending hashtags, creator leaderboards, and administrative tools.\n\nHow can I help you draft or explore today?`,
        mode: "features",
        provider: "mock-ai",
        tokenCount: 95,
      };
    }

    // 6. General Conversational Assistant
    return {
      reply: `Hi @${username}! I'm your **Connectify AI Assistant** 🤖✨\n\nI can help you with:\n1. ✍️ **Improving your posts** (enhancing tone, hooks, and hashtags)\n2. 💡 **Generating post drafts** on any topic\n3. 📝 **Summarizing discussions** and long threads\n4. 📈 **Explaining trending topics** and popular hashtags\n5. ❓ **Guiding you through Connectify features**\n\nWhat would you like to create or explore?`,
      mode: "general",
      provider: "mock-ai",
      tokenCount: 60,
    };
  }

  async assistText(prompt) {
    const res = await this.chatWithAssistant(prompt);
    return res.reply;
  }
}

/**
 * Google Gemini AI Provider implementation
 */
class GeminiAIProvider {
  constructor(apiKey, model = "gemini-1.5-flash") {
    this.apiKey = apiKey;
    this.model = model;
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  }

  async moderateText(text, options = {}) {
    const timeoutMs = options.timeoutMs || env.AI_TIMEOUT_MS || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const systemPrompt = `You are a strict social media content moderation AI.
Analyze the user content and return ONLY a JSON object with this exact structure:
{
  "riskScore": (float between 0.0 and 1.0),
  "categories": (array of strings from: "violence", "hate_speech", "harassment", "sexual", "spam", "misleading", "self_harm"),
  "reason": "(brief explanation in 1 sentence)",
  "flagged": (true if riskScore >= 0.40, otherwise false)
}`;

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nContent to analyze:\n"""${text}"""` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) {
        throw new Error("Empty response from Gemini API");
      }

      const parsed = JSON.parse(contentText);
      return {
        riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : 0.1,
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        reason: parsed.reason || "Gemini classification completed",
        flagged: !!parsed.flagged,
        provider: "gemini",
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async summarizeText(text, options = {}) {
    const timeoutMs = options.timeoutMs || env.AI_TIMEOUT_MS || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const systemPrompt = `You are a social media thread summarization assistant.
Summarize the following social media posts/thread concisely and naturally.
Focus on the core message, key takeaways, and community feedback.
Return ONLY a JSON object with this exact structure:
{
  "summary": "(a clear, well-written summary in 1-3 sentences)"
}`;

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nPosts to summarize:\n"""${text}"""` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) {
        throw new Error("Empty summarization response from Gemini API");
      }

      const parsed = JSON.parse(contentText);
      return {
        summary: parsed.summary || "",
        provider: "gemini",
        tokenCount: text.split(/\s+/).length,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async chatWithAssistant(message, options = {}) {
    const timeoutMs = options.timeoutMs || env.AI_TIMEOUT_MS || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const mode = options.mode || "general";
    const username = options.user?.username || "user";

    const systemInstruction = `You are the Connectify AI Assistant, an expert, friendly co-pilot inside Connectify (a real-time social networking platform).
You assist user @${username}.
Your capabilities include:
1. Improving tweets/posts (improving hooks, punchiness, tone, hashtags)
2. Generating engaging post drafts
3. Summarizing content and threads
4. Explaining trending hashtags (#connectify, #realtime, #ai, #mongodb)
5. Explaining Connectify features (Socket.IO direct messages, infinite scroll feed, AI moderation tiers: SAFE/FLAGGED/BLOCKED, analytics dashboard)
Keep responses concise, modern, formatted with markdown, bullet points, and appropriate emojis.`;

    const contents = [];

    // Add prior conversation history (if provided)
    if (Array.isArray(options.history) && options.history.length > 0) {
      for (const turn of options.history) {
        contents.push({
          role: turn.role === "assistant" ? "model" : "user",
          parts: [{ text: turn.content }],
        });
      }
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: `[Mode: ${mode}]\n${message}` }],
    });

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) {
        throw new Error("Empty response from Gemini AI Assistant");
      }

      return {
        reply: replyText.trim(),
        mode,
        provider: "gemini",
        tokenCount: message.split(/\s+/).length + replyText.split(/\s+/).length,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  async assistText(prompt) {
    const res = await this.chatWithAssistant(prompt);
    return res.reply;
  }
}

/**
 * Factory to obtain the configured AI provider
 */
export const getAIProvider = () => {
  const providerType = (env.AI_PROVIDER || "mock").toLowerCase();

  if (providerType === "gemini" && env.AI_API_KEY) {
    return new GeminiAIProvider(env.AI_API_KEY, env.AI_MODEL);
  }

  // Default to deterministic Mock provider
  return new MockAIProvider();
};
