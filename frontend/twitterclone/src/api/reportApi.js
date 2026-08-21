import { apiClient } from "./apiClient";

export const reportApi = {
  createReport: ({ reportedUserId, reportedPostId, reason, details }) =>
    apiClient("/api/reports", {
      method: "POST",
      body: { reportedUserId, reportedPostId, reason, details },
    }),
};
