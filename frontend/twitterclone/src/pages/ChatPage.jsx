import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { messageApi } from "../api/messageApi";
import { userApi } from "../api/userApi";
import { AppLayout } from "../components/layout/AppLayout";
import { ConversationList } from "../components/chat/ConversationList";
import { ChatWindow } from "../components/chat/ChatWindow";

export const ChatPage = () => {
  const { authUser } = useAuth();
  const { socket, onlineUsers, isConnected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const typingTimeoutRef = useRef(null);

  // Fetch initial conversations list
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const data = await messageApi.getConversations();
      if (data && data.success) {
        setConversations(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Fetch suggested users to start new chats
  const fetchSuggestedUsers = useCallback(async () => {
    try {
      const data = await userApi.getSuggestions();
      if (data && data.success) {
        setSuggestedUsers(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching suggested users:", err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchSuggestedUsers();
  }, [fetchConversations, fetchSuggestedUsers]);

  // Fetch messages when a user is selected
  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        setIsTyping(false);
        const data = await messageApi.getMessages(selectedUser._id);
        if (data && data.success) {
          setMessages(data.data || []);
          // Clear unread count in conversations state
          setConversations((prev) =>
            prev.map((c) =>
              c.otherUser?._id === selectedUser._id ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Emit socket read event
    if (socket && isConnected) {
      socket.emit("markMessagesAsRead", { senderId: selectedUser._id });
    }
  }, [selectedUser, socket, isConnected]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      const isFromCurrentChat = selectedUser && newMsg.senderId === selectedUser._id;

      if (isFromCurrentChat) {
        setMessages((prev) => [...prev, newMsg]);
        socket.emit("markMessagesAsRead", { senderId: selectedUser._id });
      }

      setConversations((prev) => {
        const otherId = newMsg.senderId === authUser._id ? newMsg.receiverId : newMsg.senderId;
        const existingIndex = prev.findIndex((c) => c.otherUser?._id === otherId);

        if (existingIndex > -1) {
          const updated = [...prev];
          const conv = updated[existingIndex];
          updated[existingIndex] = {
            ...conv,
            lastMessage: newMsg,
            unreadCount: isFromCurrentChat
              ? 0
              : (conv.unreadCount || 0) + (newMsg.senderId !== authUser._id ? 1 : 0),
            updatedAt: new Date().toISOString(),
          };
          const [moved] = updated.splice(existingIndex, 1);
          return [moved, ...updated];
        } else {
          fetchConversations();
          return prev;
        }
      });
    };

    const handleTyping = ({ senderId }) => {
      if (selectedUser && senderId === selectedUser._id) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ senderId }) => {
      if (selectedUser && senderId === selectedUser._id) {
        setIsTyping(false);
      }
    };

    const handleMessagesRead = ({ readerId, readAt }) => {
      if (selectedUser && readerId === selectedUser._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === authUser._id ? { ...msg, read: true, readAt } : msg
          )
        );
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("messagesRead", handleMessagesRead);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [socket, selectedUser, authUser, fetchConversations]);

  const handleInputChange = (e) => {
    setNewMessageText(e.target.value);

    if (socket && selectedUser) {
      socket.emit("typing", { receiverId: selectedUser._id });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", { receiverId: selectedUser._id });
      }, 1500);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = newMessageText.trim();
    if (!trimmed || !selectedUser || sending) return;

    setSending(true);
    if (socket && selectedUser) {
      socket.emit("stopTyping", { receiverId: selectedUser._id });
    }

    try {
      const data = await messageApi.sendMessage(selectedUser._id, trimmed);
      if (data && data.success) {
        setMessages((prev) => [...prev, data.data]);
        setNewMessageText("");

        setConversations((prev) => {
          const index = prev.findIndex((c) => c.otherUser?._id === selectedUser._id);
          if (index > -1) {
            const updated = [...prev];
            const conv = updated[index];
            updated[index] = {
              ...conv,
              lastMessage: data.data,
              updatedAt: new Date().toISOString(),
            };
            const [moved] = updated.splice(index, 1);
            return [moved, ...updated];
          } else {
            return [
              {
                _id: "temp-" + Date.now(),
                otherUser: selectedUser,
                lastMessage: data.data,
                unreadCount: 0,
                updatedAt: new Date().toISOString(),
              },
              ...prev,
            ];
          }
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <div className="chat-layout-content">
        <ConversationList
          conversations={conversations}
          suggestedUsers={suggestedUsers}
          selectedUser={selectedUser}
          onSelectUser={(user) => setSelectedUser(user)}
          loading={loadingConversations}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isConnected={isConnected}
          onlineUsers={onlineUsers}
        />

        <ChatWindow
          selectedUser={selectedUser}
          onBack={() => setSelectedUser(null)}
          messages={messages}
          currentUserId={authUser._id}
          newMessageText={newMessageText}
          onInputChange={handleInputChange}
          onSendMessage={handleSendMessage}
          sending={sending}
          loadingMessages={loadingMessages}
          isTyping={isTyping}
          isRecipientOnline={onlineUsers.includes(selectedUser?._id?.toString())}
        />
      </div>
    </AppLayout>
  );
};
