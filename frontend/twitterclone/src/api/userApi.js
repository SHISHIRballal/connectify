import { apiClient } from "./apiClient";

export const userApi = {
  getProfile: (username) => apiClient(`/api/users/profile/${encodeURIComponent(username)}`),

  getSuggestions: () => apiClient("/api/users/suggestions"),

  followUser: (userId) =>
    apiClient(`/api/users/follow/${userId}`, {
      method: "POST",
    }),

  updateProfile: (updateData) =>
    apiClient("/api/users/update", {
      method: "POST",
      body: updateData,
    }),
};
