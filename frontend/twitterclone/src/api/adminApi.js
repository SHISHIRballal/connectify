import { apiClient } from "./apiClient";

export const adminApi = {
  getOverview: () => apiClient("/api/admin/overview"),

  getUsers: ({ page = 1, limit = 20, search = "", role = "", status = "" } = {}) => {
    let url = `/api/admin/users?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (role) url += `&role=${encodeURIComponent(role)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return apiClient(url);
  },

  getPosts: ({ page = 1, limit = 15, search = "", hasReports = false } = {}) => {
    let url = `/api/admin/posts?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (hasReports) url += `&hasReports=true`;
    return apiClient(url);
  },

  getPostReports: (postId) => apiClient(`/api/admin/posts/${postId}/reports`),

  suspendUser: (userId, reason = "") =>
    apiClient(`/api/admin/users/${userId}/suspend`, {
      method: "POST",
      body: { reason },
    }),

  activateUser: (userId) =>
    apiClient(`/api/admin/users/${userId}/activate`, {
      method: "POST",
    }),

  changeRole: (userId, role) =>
    apiClient(`/api/admin/users/${userId}/role`, {
      method: "POST",
      body: { role },
    }),

  getReports: ({ page = 1, limit = 20, status = "" } = {}) => {
    let url = `/api/admin/reports?page=${page}&limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return apiClient(url);
  },

  resolveReport: (reportId, { status, resolutionNotes, actionTaken } = {}) =>
    apiClient(`/api/admin/reports/${reportId}/resolve`, {
      method: "POST",
      body: { status, resolutionNotes, actionTaken },
    }),

  getModerationLogs: ({ page = 1, limit = 20 } = {}) =>
    apiClient(`/api/admin/logs?page=${page}&limit=${limit}`),

  getAnalytics: () => apiClient("/api/admin/analytics"),
};
