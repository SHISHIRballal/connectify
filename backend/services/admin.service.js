import User from "../model/user.model.js";
import Post from "../model/post.model.js";
import Report from "../model/report.model.js";
import ModerationLog from "../model/moderationLog.model.js";
import ApiError from "../utils/ApiError.js";
import { deletePost } from "./post.service.js";

/**
 * Get dashboard overview metrics and recent activity
 */
export const getDashboardOverview = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    adminUsers,
    moderatorUsers,
    totalPosts,
    posts24h,
    postsWithImages,
    totalReports,
    pendingReports,
    resolvedReports,
    dismissedReports,
    totalModerationLogs,
    recentLogs,
    recentPendingReports,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isSuspended: { $ne: true } }),
    User.countDocuments({ isSuspended: true }),
    User.countDocuments({ role: "ADMIN" }),
    User.countDocuments({ role: "MODERATOR" }),
    Post.countDocuments(),
    Post.countDocuments({ createdAt: { $gte: oneDayAgo } }),
    Post.countDocuments({ img: { $exists: true, $ne: "" } }),
    Report.countDocuments(),
    Report.countDocuments({ status: "PENDING" }),
    Report.countDocuments({ status: "RESOLVED" }),
    Report.countDocuments({ status: "DISMISSED" }),
    ModerationLog.countDocuments(),
    ModerationLog.find()
      .populate("moderator", "username fullname role profileimg")
      .sort({ createdAt: -1 })
      .limit(5),
    Report.find({ status: "PENDING" })
      .populate("reporter", "username fullname")
      .populate("reportedUser", "username fullname")
      .populate("reportedPost", "text img")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  return {
    metrics: {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        admins: adminUsers,
        moderators: moderatorUsers,
      },
      posts: {
        total: totalPosts,
        createdLast24h: posts24h,
        withImages: postsWithImages,
      },
      reports: {
        total: totalReports,
        pending: pendingReports,
        resolved: resolvedReports,
        dismissed: dismissedReports,
      },
      moderation: {
        totalActions: totalModerationLogs,
      },
    },
    recentLogs,
    recentPendingReports,
  };
};

/**
 * Get paginated list of all users with search and filtering (Admin / Moderator)
 */
export const getAllUsers = async ({ page = 1, limit = 20, search = "", role = "", status = "" }) => {
  const query = {};

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { username: { $regex: s, $options: "i" } },
      { fullname: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
    ];
  }

  if (role && role.trim()) {
    query.role = role.trim().toUpperCase();
  }

  if (status === "suspended") {
    query.isSuspended = true;
  } else if (status === "active") {
    query.isSuspended = { $ne: true };
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Get paginated posts with report counts for post management
 */
export const getAdminPosts = async ({ page = 1, limit = 15, search = "", hasReports = false }) => {
  const query = {};

  if (search && search.trim()) {
    query.text = { $regex: search.trim(), $options: "i" };
  }

  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    Post.find(query)
      .populate("user", "username fullname profileimg role isSuspended")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Post.countDocuments(query),
  ]);

  // Aggregate report counts for the returned posts
  const postIds = posts.map((p) => p._id);
  const reportCounts = await Report.aggregate([
    { $match: { reportedPost: { $in: postIds } } },
    { $group: { _id: "$reportedPost", count: { $sum: 1 }, pendingCount: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } } } },
  ]);

  const reportCountMap = {};
  reportCounts.forEach((r) => {
    reportCountMap[r._id.toString()] = { total: r.count, pending: r.pendingCount };
  });

  const enrichedPosts = posts.map((p) => {
    const postObj = p.toObject();
    const reportsInfo = reportCountMap[p._id.toString()] || { total: 0, pending: 0 };
    return {
      ...postObj,
      reportCount: reportsInfo.total,
      pendingReportCount: reportsInfo.pending,
      likesCount: postObj.likes?.length || 0,
      commentsCount: postObj.comments?.length || 0,
    };
  });

  const finalPosts = hasReports ? enrichedPosts.filter((p) => p.reportCount > 0) : enrichedPosts;

  return {
    posts: finalPosts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Get all reports filed against a specific post
 */
export const getPostReports = async ({ postId }) => {
  const reports = await Report.find({ reportedPost: postId })
    .populate("reporter", "username fullname profileimg role")
    .populate("resolvedBy", "username fullname role")
    .sort({ createdAt: -1 });

  return reports;
};

/**
 * Suspend user account (Admin only)
 */
export const suspendUser = async ({ moderatorId, userId, reason = "" }) => {
  if (moderatorId.toString() === userId.toString()) {
    throw new ApiError(400, "You cannot suspend your own account");
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  if ((targetUser.role || "").toUpperCase() === "ADMIN") {
    throw new ApiError(403, "Cannot suspend an administrator account");
  }

  targetUser.isSuspended = true;
  targetUser.suspendedAt = new Date();
  targetUser.suspensionReason = reason || "Suspended by administrator";
  await targetUser.save();

  // Audit log
  await ModerationLog.create({
    moderator: moderatorId,
    action: "SUSPEND_USER",
    targetType: "USER",
    targetId: userId,
    details: {
      username: targetUser.username,
      reason: targetUser.suspensionReason,
    },
  });

  const response = targetUser.toObject();
  delete response.password;
  return response;
};

/**
 * Activate suspended user account (Admin only)
 */
export const activateUser = async ({ moderatorId, userId }) => {
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  targetUser.isSuspended = false;
  targetUser.suspendedAt = null;
  targetUser.suspensionReason = "";
  await targetUser.save();

  // Audit log
  await ModerationLog.create({
    moderator: moderatorId,
    action: "ACTIVATE_USER",
    targetType: "USER",
    targetId: userId,
    details: {
      username: targetUser.username,
    },
  });

  const response = targetUser.toObject();
  delete response.password;
  return response;
};

/**
 * Change user role (Admin only)
 */
export const changeUserRole = async ({ adminId, userId, newRole }) => {
  const normalizedRole = (newRole || "").toUpperCase();
  if (!["USER", "MODERATOR", "ADMIN"].includes(normalizedRole)) {
    throw new ApiError(400, "Invalid role. Allowed roles: USER, MODERATOR, ADMIN");
  }

  if (adminId.toString() === userId.toString() && normalizedRole !== "ADMIN") {
    throw new ApiError(400, "You cannot demote your own administrator role");
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  // If demoting an admin, ensure at least one other admin exists
  if ((targetUser.role || "").toUpperCase() === "ADMIN" && normalizedRole !== "ADMIN") {
    const adminCount = await User.countDocuments({ role: "ADMIN", isSuspended: false });
    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot demote the last active administrator");
    }
  }

  const previousRole = targetUser.role;
  targetUser.role = normalizedRole;
  await targetUser.save();

  // Audit log
  await ModerationLog.create({
    moderator: adminId,
    action: "CHANGE_ROLE",
    targetType: "USER",
    targetId: userId,
    details: {
      username: targetUser.username,
      previousRole,
      newRole: normalizedRole,
    },
  });

  const response = targetUser.toObject();
  delete response.password;
  return response;
};

/**
 * Get reports list (Admin & Moderator)
 */
export const getReports = async ({ page = 1, limit = 20, status = "" }) => {
  const query = {};
  if (status && status.trim()) {
    query.status = status.trim().toUpperCase();
  }

  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate("reporter", "username fullname profileimg role")
      .populate("reportedUser", "username fullname profileimg role isSuspended")
      .populate({
        path: "reportedPost",
        populate: {
          path: "user",
          select: "username fullname profileimg role",
        },
      })
      .populate("resolvedBy", "username fullname role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Report.countDocuments(query),
  ]);

  return {
    reports,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Resolve or dismiss a report with optional actions (Admin & Moderator)
 */
export const resolveReport = async ({
  moderator,
  reportId,
  status = "RESOLVED",
  resolutionNotes = "",
  actionTaken = "NONE",
}) => {
  const report = await Report.findById(reportId);
  if (!report) {
    throw new ApiError(404, "Report not found");
  }

  const normalizedStatus = status.toUpperCase();
  if (!["RESOLVED", "DISMISSED"].includes(normalizedStatus)) {
    throw new ApiError(400, "Status must be RESOLVED or DISMISSED");
  }

  // Execute optional action
  if (actionTaken === "POST_DELETED" && report.reportedPost) {
    await deletePost({ user: moderator, postId: report.reportedPost }).catch((err) => {
      console.warn("Report action delete post failed (might already be deleted):", err.message);
    });
  } else if (actionTaken === "USER_SUSPENDED" && report.reportedUser) {
    if ((moderator.role || "").toUpperCase() !== "ADMIN") {
      throw new ApiError(403, "Only administrators can suspend users as a report action");
    }
    await suspendUser({
      moderatorId: moderator._id,
      userId: report.reportedUser,
      reason: resolutionNotes || `Suspended following report #${reportId}`,
    }).catch((err) => {
      console.warn("Report action suspend user failed:", err.message);
    });
  }

  report.status = normalizedStatus;
  report.resolvedBy = moderator._id;
  report.resolutionNotes = resolutionNotes || "";
  report.actionTaken = actionTaken;
  await report.save();

  // Audit log
  await ModerationLog.create({
    moderator: moderator._id,
    action: normalizedStatus === "DISMISSED" ? "DISMISS_REPORT" : "RESOLVE_REPORT",
    targetType: "REPORT",
    targetId: reportId,
    details: {
      status: normalizedStatus,
      actionTaken,
      resolutionNotes,
      reportedPost: report.reportedPost,
      reportedUser: report.reportedUser,
    },
  });

  return report;
};

/**
 * Get moderation audit logs (Admin & Moderator)
 */
export const getModerationLogs = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    ModerationLog.find()
      .populate("moderator", "username fullname profileimg role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ModerationLog.countDocuments(),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Get aggregated analytics across reports, moderation, user roles, and recent activity
 */
export const getDashboardAnalytics = async () => {
  const [
    reportsByReason,
    reportsByStatus,
    actionsByType,
    usersByRole,
    usersByStatus,
  ] = await Promise.all([
    Report.aggregate([
      { $group: { _id: "$reason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    ModerationLog.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $group: { _id: { $cond: [{ $eq: ["$isSuspended", true] }, "SUSPENDED", "ACTIVE"] }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    reportsByReason: reportsByReason.map((r) => ({ reason: r._id, count: r.count })),
    reportsByStatus: reportsByStatus.map((r) => ({ status: r._id, count: r.count })),
    actionsByType: actionsByType.map((a) => ({ action: a._id, count: a.count })),
    usersByRole: usersByRole.map((u) => ({ role: u._id || "USER", count: u.count })),
    usersByStatus: usersByStatus.map((u) => ({ status: u._id, count: u.count })),
  };
};
