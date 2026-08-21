import { apiClient } from "./apiClient";

export const authApi = {
  getMe: () => apiClient("/api/auth/me"),
  login: (username, password) =>
    apiClient("/api/auth/login", {
      method: "POST",
      body: { username, password },
    }),
  signup: (userData) =>
    apiClient("/api/auth/signup", {
      method: "POST",
      body: userData,
    }),
  logout: () =>
    apiClient("/api/auth/logout", {
      method: "POST",
    }),
};
