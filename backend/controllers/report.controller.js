import { createReport } from "../services/report.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const createReportController = async (req, res, next) => {
  try {
    const reporterId = req.user._id;
    const { reportedUserId, reportedPostId, reason, details } = req.body;
    const report = await createReport({
      reporterId,
      reportedUserId,
      reportedPostId,
      reason,
      details,
    });
    return ApiResponse.success(res, 201, "Report submitted successfully. Our team will review it.", report);
  } catch (error) {
    next(error);
  }
};
