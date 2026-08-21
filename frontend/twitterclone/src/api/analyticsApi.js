import { apiClient } from "./apiClient";

export const analyticsApi = {
  getSummary: ({ timeframe = "7d", startDate, endDate } = {}) => {
    let url = `/api/analytics/summary?timeframe=${timeframe}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    return apiClient(url);
  },

  getTrendingHashtags: ({ timeframe = "7d" } = {}) =>
    apiClient(`/api/analytics/hashtags?timeframe=${timeframe}`),

  getMostActiveUsers: ({ timeframe = "7d" } = {}) =>
    apiClient(`/api/analytics/active-users?timeframe=${timeframe}`),
};
