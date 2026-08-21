import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserAvatar } from "../common/UserAvatar";
import { EmptyState } from "../common/EmptyState";
import { Send, Check, CheckCheck, MessageSquare, ArrowLeft } from "lucide-react";

export const ChatWindow = ({
  selectedUser,
  onBack,
  messages,
  currentUserId,
  newMessageText,
  onInputChange,
  onSendMessage,
  sending,
  loadingMessages,
  isTyping,
  isRecipientOnline,
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (!selectedUser) {
    return (
      <main className="chat-main no-chat-selected">
        <EmptyState
          icon={MessageSquare}
          title="Select a conversation"
          description="Choose an existing conversation from the left or select a user to start chatting."
        />
      </main>
    );
  }

  return (
    <main className="chat-main chat-window">
      {/* Chat Header */}
      <header className="chat-header">
        <div className="chat-recipient-info">
          {onBack && (
            <button type="button" onClick={onBack} className="mobile-chat-back-btn">
              <ArrowLeft size={20} />
            </button>
          )}

          <Link to={`/profile/${selectedUser.username}`}>
            <UserAvatar
              user={selectedUser}
              size="md"
              isOnline={isRecipientOnline}
              showOnlineDot={true}
            />
          </Link>

          <div>
            <Link to={`/profile/${selectedUser.username}`} className="recipient-name-link">
              <h3 className="recipient-name">{selectedUser.fullname}</h3>
            </Link>
            <div className="recipient-status">
              {isTyping ? (
                <span className="typing-text">typing...</span>
              ) : isRecipientOnline ? (
                <span className="status-online">Online</span>
              ) : (
                <span className="status-offline">Offline</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Message Stream */}
      <div className="messages-container">
        {loadingMessages ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <span>Loading conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Start your conversation"
            description={`Say hello to ${selectedUser.fullname}!`}
          />
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.senderId === currentUserId;
            const time = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg._id || index}
                className={`message-bubble-wrapper ${isMine ? "outgoing" : "incoming"}`}
              >
                <div className={`message-bubble ${isMine ? "mine" : "theirs"}`}>
                  <p className="message-content">{msg.message}</p>
                  <div className="message-meta">
                    <span className="message-time">{time}</span>
                    {isMine && (
                      <span className="message-status">
                        {msg.read ? (
                          <CheckCheck size={14} className="read-icon read" />
                        ) : (
                          <Check size={14} className="read-icon sent" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isTyping && (
          <div className="message-bubble-wrapper incoming">
            <div className="typing-bubble">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <footer className="chat-footer">
        <form onSubmit={onSendMessage} className="message-form">
          <input
            type="text"
            placeholder={`Message @${selectedUser.username}...`}
            value={newMessageText}
            onChange={onInputChange}
            maxLength={2000}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!newMessageText.trim() || sending}
            className="send-button"
            title="Send (Enter)"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </main>
  );
};
