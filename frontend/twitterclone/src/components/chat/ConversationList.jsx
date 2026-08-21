import React from "react";
import { UserAvatar } from "../common/UserAvatar";
import { ConversationSkeleton } from "../common/LoadingSkeleton";
import { MessageSquare, Search, Users, Wifi, WifiOff } from "lucide-react";

export const ConversationList = ({
  conversations,
  suggestedUsers,
  selectedUser,
  onSelectUser,
  loading,
  searchQuery,
  onSearchChange,
  isConnected,
  onlineUsers,
}) => {
  const isUserOnline = (userId) => onlineUsers.includes(userId?.toString());

  const filteredConversations = conversations.filter((c) => {
    const name = c.otherUser?.fullname?.toLowerCase() || "";
    const username = c.otherUser?.username?.toLowerCase() || "";
    const q = searchQuery.toLowerCase();
    return name.includes(q) || username.includes(q);
  });

  return (
    <aside className="chat-sidebar">
      {/* Real-time Connection Bar */}
      <div className={`connection-bar ${isConnected ? "connected" : "disconnected"}`}>
        {isConnected ? (
          <>
            <Wifi size={14} />
            <span>Connected ({onlineUsers.length} online)</span>
          </>
        ) : (
          <>
            <WifiOff size={14} />
            <span>Reconnecting to chat...</span>
          </>
        )}
      </div>

      {/* Search Input */}
      <div className="search-box">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Suggested Users Strip */}
      {suggestedUsers.length > 0 && (
        <div className="suggested-section">
          <div className="section-title">
            <Users size={14} />
            <span>Start a Chat</span>
          </div>
          <div className="suggested-users-scroll">
            {suggestedUsers.map((u) => {
              const online = isUserOnline(u._id);
              return (
                <button
                  key={u._id}
                  type="button"
                  className={`suggested-user-chip ${
                    selectedUser?._id === u._id ? "active" : ""
                  }`}
                  onClick={() => onSelectUser(u)}
                >
                  <UserAvatar user={u} size="xs" isOnline={online} showOnlineDot={true} />
                  <span>{u.fullname?.split(" ")[0] || u.username}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="conversations-list">
        <div className="section-title">
          <MessageSquare size={14} />
          <span>Messages</span>
        </div>

        {loading ? (
          <div className="conversations-skeletons">
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="empty-conversations">
            <p>No conversations found.</p>
            <small>Select a user above to start chatting!</small>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const other = conv.otherUser;
            if (!other) return null;
            const online = isUserOnline(other._id);
            const isSelected = selectedUser?._id === other._id;

            return (
              <div
                key={conv._id}
                className={`conversation-item ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectUser(other)}
              >
                <UserAvatar user={other} size="md" isOnline={online} showOnlineDot={true} />

                <div className="conversation-content">
                  <div className="conv-top-row">
                    <span className="conv-name">{other.fullname}</span>
                    {conv.lastMessage && (
                      <span className="conv-time">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <div className="conv-bottom-row">
                    <p className="last-message-text">
                      {conv.lastMessage?.message || "No messages yet"}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="unread-badge">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
