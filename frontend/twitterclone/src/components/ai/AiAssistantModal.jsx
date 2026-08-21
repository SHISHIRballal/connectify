import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { aiApi } from "../../api/aiApi";
import { UserAvatar } from "../common/UserAvatar";
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  FileText,
  HelpCircle,
  Wand2,
} from "lucide-react";

export const AiAssistantModal = ({ isOpen, onClose, initialPrompt = "", initialMode = "general" }) => {
  const { authUser } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: "init",
      role: "assistant",
      content: `Hi @${authUser?.username || "friend"}! 👋 I'm your **Connectify AI Assistant**.\n\nHow can I help you today? You can choose a quick action below or ask me anything about drafting posts, improving tweets, trends, or Connectify features!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState(initialPrompt || "");
  const [mode, setMode] = useState(initialMode || "general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: "Improve my post", mode: "improve", icon: Wand2, prompt: "Improve this tweet: " },
    { label: "Draft a post", mode: "draft", icon: Lightbulb, prompt: "Write an engaging post about " },
    { label: "Explain trends", mode: "trends", icon: TrendingUp, prompt: "What topics and hashtags are trending on Connectify right now?" },
    { label: "Connectify features", mode: "features", icon: HelpCircle, prompt: "Explain Connectify's real-time messaging and infinite scrolling features." },
    { label: "Summarize text", mode: "summarize", icon: FileText, prompt: "Summarize this: " },
  ];

  const handleSendMessage = async (textToSend = input, modeOverride = mode) => {
    const text = (textToSend || "").trim();
    if (!text || loading) return;

    const userMessageId = `u_${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ];

    setMessages(newMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      // Build bounded history payload (exclude system greeting)
      const historyPayload = newMessages
        .filter((m) => m.id !== "init")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await aiApi.chat({
        message: text,
        history: historyPayload,
        mode: modeOverride,
      });

      if (res && res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: "assistant",
            content: res.data.reply,
            mode: res.data.mode,
            timestamp: new Date(res.data.timestamp || Date.now()),
          },
        ]);
      } else {
        setError(res?.message || "Failed to get AI response. Please try again.");
      }
    } catch (err) {
      setError(err.message || "AI Assistant connection failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickPrompt = (item) => {
    setMode(item.mode);
    setInput(item.prompt);
    inputRef.current?.focus();
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `init_${Date.now()}`,
        role: "assistant",
        content: `Conversation reset! How can I assist you now, @${authUser?.username || "friend"}?`,
        timestamp: new Date(),
      },
    ]);
    setError(null);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-modal-header">
          <div className="ai-header-left">
            <div className="ai-sparkle-avatar">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="ai-header-title">Connectify AI Assistant</h3>
              <span className="ai-header-subtitle">Real-Time Social Co-Pilot</span>
            </div>
          </div>

          <div className="ai-header-actions">
            <button
              type="button"
              onClick={handleClearHistory}
              className="ai-icon-btn"
              title="Clear conversation"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ai-icon-btn close-btn"
              title="Close Assistant"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Action Chips */}
        <div className="ai-quick-chips-bar">
          {quickPrompts.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                type="button"
                className={`ai-chip-btn ${mode === p.mode ? "active" : ""}`}
                onClick={() => handleQuickPrompt(p)}
              >
                <Icon size={12} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Stream */}
        <div className="ai-messages-stream">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`ai-message-row ${isUser ? "user-row" : "assistant-row"}`}>
                {!isUser && (
                  <div className="ai-bot-avatar">
                    <Sparkles size={14} />
                  </div>
                )}

                <div className={`ai-message-bubble ${isUser ? "user-bubble" : "assistant-bubble"}`}>
                  <div className="ai-message-content">
                    {m.content.split("\n").map((paragraph, pIdx) => {
                      if (!paragraph.trim()) return <div key={pIdx} className="ai-para-spacer" />;
                      return (
                        <p key={pIdx} className="ai-paragraph">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>

                  {/* Bubble Footer & Actions */}
                  <div className="ai-bubble-footer">
                    <span className="ai-message-time">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.content)}
                        className="ai-copy-btn"
                        title="Copy to clipboard"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check size={12} /> <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="ai-user-avatar-wrap">
                    <UserAvatar user={authUser} size="xs" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking / Loading Animation */}
          {loading && (
            <div className="ai-message-row assistant-row">
              <div className="ai-bot-avatar">
                <Sparkles size={14} />
              </div>
              <div className="ai-message-bubble assistant-bubble ai-thinking-bubble">
                <div className="ai-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="ai-thinking-text">AI is thinking...</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="ai-error-banner">
              <AlertCircle size={14} />
              <span>{error}</span>
              <button type="button" onClick={() => handleSendMessage()} className="ai-error-retry-btn">
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="ai-modal-footer">
          <div className="ai-input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or request a tweet draft..."
              className="ai-prompt-input"
              rows={2}
              maxLength={2000}
            />
            <div className="ai-input-bottom-row">
              <span className="ai-char-counter">{input.length}/2000</span>
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                className="ai-send-btn"
                title="Send message"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
