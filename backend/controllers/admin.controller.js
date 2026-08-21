import {
  getDashboardOverview,
  getAllUsers,
  getAdminPosts,
  getPostReports,
  suspendUser,
  activateUser,
  changeUserRole,
  getReports,
  resolveReport,
  getModerationLogs,
  getDashboardAnalytics,
} from "../services/admin.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getDashboardOverviewController = async (req, res, next) => {
  try {
    const data = await getDashboardOverview();
    return ApiResponse.success(res, 200, "Dashboard overview retrieved successfully", data);
  } catch (error) {
    next(error);
  }
};

export const getUsersController = async (req, res, next) => {
  try {
    const { page, limit, search, role, status } = req.validatedQuery || req.query;
    const data = await getAllUsers({ page, limit, search, role, status });
    return ApiResponse.success(res, 200, "Users retrieved successfully", data);
  } catch (error) {
    next(error);
  }
};

export const getAdminPostsController = async (req, res, next) => {
  try {
    const { page, limit, search, hasReports } = req.validatedQuery || req.query;
    const data = await getAdminPosts({ page, limit, search, hasReports });
    return ApiResponse.success(res, 200, "Posts retrieved successfully", data);
  } catch (error) {
    next(error);
  }
};

export const getPostReportsController = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const data = await getPostReports({ postId });
    return ApiResponse.success(res, 200, "Post reports retrieved successfully", data);
  } catch (error) {
    next(error);
  }
};

export const suspendUserController = async (req, res, next) => {
  try {
    const moderatorId = req.user._id;
    const userId = req.params.id;
    const { reason } = req.body;
    const user = await suspendUser({ moderatorId, userId, reason });
    return ApiResponse.success(res, 200, "User suspended successfully", user);
  } catch (error) {
    next(error);
  }
};

export const activateUserController = async (req, res, next) => {
  try {
    const moderatorId = req.user._id;
    const userId = req.params.id;
    const user = await activateUser({ moderatorId, userId });
    return ApiResponse.success(res, 200, "User activated successfully", user);
  } catch (error) {
    next(error);
  }
};

export const changeRoleController = async (req, res, next) => {
  try {
    const adminId = req.user._id;
    const userId = req.params.id;
    const { role } = req.body;
    const user = await changeUserRole({ adminId, userId, newRole: role });
    return ApiResponse.success(res, 200, `Role updated to ${role.toUpperCase()} successfully`, user);
  } catch (error) {
    next(error);
  }
};

export const getReportsController = async (req, res, next) => {
  try {
    const { page, limit, status } = req.validatedQuery || req.query;
    const data = await getReports({ page, limit, status });
    return ApiResponse.success(res, 200, "Reports retrieved successfully", data);
  } catch (error) {
    next(error);
  }
};

export const resolveReportController = async (req, res, next) => {
  try {
    const moderator = req.user;
    const reportId = req.params.id;
    const { status, resolutionNotes, actionTaken } = req.body;
    const report = await resolveReport({
      moderator,
      reportId,
      status,
      resolutionNotes,
      actionTaken,
    });
    return ApiResponse.success(res, 200, "Report resolved successfully", report);
  } catch (error) {
    next(error);
  }
};

export const getModerationLogsController = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const data = await getModerationLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return ApiResponse.success(res, 200, "Moderation logs retrieved successfully", data);
  } catch (error) {
    next(error);
  }
};

export const getDashboardAnalyticsController = async (req, res, next) => {
  try {
    const data = await getDashboardAnalytics();
    return ApiResponse.success(res, 200, "Analytics retrieved successfully", data);
  } catch (error) {
    next(error);
  }
};
