import { apiClient } from "./apiClient";

export const messageApi = {
  getConversations: () => apiClient("/api/messages/conversations"),

  getMessages: (otherUserId) => apiClient(`/api/messages/${otherUserId}`),

  sendMessage: (otherUserId, message) =>
    apiClient(`/api/messages/send/${otherUserId}`, {
      method: "POST",
      body: { message },
    }),

  markAsRead: (otherUserId) =>
    apiClient(`/api/messages/read/${otherUserId}`, {
      method: "POST",
    }),
};
