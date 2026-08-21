import Report from "../model/report.model.js";
import Post from "../model/post.model.js";
import User from "../model/user.model.js";
import ApiError from "../utils/ApiError.js";

/**
 * Submit a report for a post or user
 */
export const createReport = async ({
  reporterId,
  reportedUserId = null,
  reportedPostId = null,
  reason,
  details = "",
}) => {
  if (!reportedUserId && !reportedPostId) {
    throw new ApiError(400, "Must specify a reported user or post");
  }

  // Validate reported post if provided
  if (reportedPostId) {
    const post = await Post.findById(reportedPostId);
    if (!post) {
      throw new ApiError(404, "Reported post not found");
    }
    // Also record post author
    if (!reportedUserId) {
      reportedUserId = post.user;
    }
  }

  // Validate reported user if provided
  if (reportedUserId) {
    const targetUser = await User.findById(reportedUserId);
    if (!targetUser) {
      throw new ApiError(404, "Reported user not found");
    }
    if (targetUser._id.toString() === reporterId.toString()) {
      throw new ApiError(400, "You cannot report your own account/post");
    }
  }

  const newReport = new Report({
    reporter: reporterId,
    reportedUser: reportedUserId,
    reportedPost: reportedPostId,
    reason,
    details: details || "",
  });

  await newReport.save();
  return newReport;
};
