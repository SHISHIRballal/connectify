import User from "../model/user.model.js";
import Post from "../model/post.model.js";
import Report from "../model/report.model.js";
import ModerationLog from "../model/moderationLog.model.js";

/**
 * Calculate Date Range from timeframe string or custom dates
 */
export const calculateDateRange = ({ timeframe = "7d", startDate, endDate } = {}) => {
  const now = new Date();
  let start = new Date(0); // Default epoch for "all"
  let end = now;

  if (endDate) {
    end = new Date(endDate);
  }

  if (startDate) {
    start = new Date(startDate);
  } else if (timeframe === "7d") {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "30d") {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "90d") {
    start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (timeframe === "all") {
    start = new Date(0);
  }

  return { start, end };
};

/**
 * 1-3. User Analytics (Total users, new users, active users, signups per day)
 */
export const getUserAnalytics = async ({ start, end }) => {
  const [
    totalUsers,
    newUsers,
    postCreators,
    commentAuthors,
    userSignupsPerDay,
    rolesDistribution,
    statusDistribution,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    // Active users: creators of posts in date range
    Post.find({ createdAt: { $gte: start, $lte: end } }).distinct("user"),
    // Active users: authors of comments in date range
    Post.find({ "comments.createdAt": { $gte: start, $lte: end } }).distinct("comments.user"),
    // Daily signups time series
    User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Roles breakdown
    User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Status breakdown
    User.aggregate([
      {
        $group: {
          _id: { $cond: [{ $eq: ["$isSuspended", true] }, "SUSPENDED", "ACTIVE"] },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Merge distinct active users
  const activeUserIds = new Set([
    ...postCreators.map((id) => id.toString()),
    ...commentAuthors.map((id) => id.toString()),
  ]);

  return {
    totalUsers,
    newUsers,
    activeUsersCount: activeUserIds.size,
    signupsPerDay: userSignupsPerDay.map((item) => ({ date: item._id, count: item.count })),
    rolesDistribution: rolesDistribution.map((r) => ({ role: r._id || "USER", count: r.count })),
    statusDistribution: statusDistribution.map((s) => ({ status: s._id, count: s.count })),
  };
};

/**
 * 4-7. Post & Engagement Analytics (Total posts, posts per day, likes, comments, media)
 */
export const getPostAnalytics = async ({ start, end }) => {
  const [
    totalPosts,
    newPosts,
    postsPerDay,
    totalsAggregation,
    mediaBreakdown,
  ] = await Promise.all([
    Post.countDocuments(),
    Post.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    // Posts per day time-series
    Post.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Total likes and comments sum across all posts
    Post.aggregate([
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
          totalComments: { $sum: { $size: { $ifNull: ["$comments", []] } } },
        },
      },
    ]),
    // Media vs text posts breakdown
    Post.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $ne: ["$img", ""] }, { $ne: ["$img", null] }] },
              "WITH_MEDIA",
              "TEXT_ONLY",
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const likesCount = totalsAggregation[0]?.totalLikes || 0;
  const commentsCount = totalsAggregation[0]?.totalComments || 0;

  return {
    totalPosts,
    newPosts,
    postsPerDay: postsPerDay.map((p) => ({ date: p._id, count: p.count })),
    totalLikes: likesCount,
    totalComments: commentsCount,
    averageLikesPerPost: totalPosts > 0 ? Number((likesCount / totalPosts).toFixed(2)) : 0,
    averageCommentsPerPost: totalPosts > 0 ? Number((commentsCount / totalPosts).toFixed(2)) : 0,
    mediaBreakdown: mediaBreakdown.map((m) => ({ type: m._id, count: m.count })),
  };
};

/**
 * 8, 11, 12. Engagement, Trending Hashtags, and Most Active Users
 */
export const getEngagementAnalytics = async ({ start, end, hashtagsLimit = 15, activeUsersLimit = 10 }) => {
  const [
    followsAggregation,
    trendingHashtags,
    mostActiveUsers,
  ] = await Promise.all([
    // Total follow connections across the platform
    User.aggregate([
      {
        $group: {
          _id: null,
          totalFollows: { $sum: { $size: { $ifNull: ["$following", []] } } },
        },
      },
    ]),
    // Trending hashtags extraction aggregation
    Post.aggregate([
      { $match: { text: { $exists: true, $ne: "" } } },
      {
        $project: {
          hashtags: {
            $regexFindAll: {
              input: "$text",
              regex: "#[a-zA-Z0-9_]+",
            },
          },
        },
      },
      { $unwind: "$hashtags" },
      {
        $project: {
          tag: { $toLower: "$hashtags.match" },
        },
      },
      {
        $group: {
          _id: "$tag",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: hashtagsLimit },
    ]),
    // Most active creators/users
    Post.aggregate([
      {
        $group: {
          _id: "$user",
          postCount: { $sum: 1 },
          totalLikesReceived: { $sum: { $size: { $ifNull: ["$likes", []] } } },
          totalCommentsReceived: { $sum: { $size: { $ifNull: ["$comments", []] } } },
        },
      },
      { $sort: { postCount: -1, totalLikesReceived: -1 } },
      { $limit: activeUsersLimit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          postCount: 1,
          totalLikesReceived: 1,
          totalCommentsReceived: 1,
          username: { $ifNull: ["$userInfo.username", "Unknown"] },
          fullname: { $ifNull: ["$userInfo.fullname", "User"] },
          profileimg: { $ifNull: ["$userInfo.profileimg", ""] },
          role: { $ifNull: ["$userInfo.role", "USER"] },
          followersCount: { $size: { $ifNull: ["$userInfo.followers", []] } },
        },
      },
    ]),
  ]);

  const totalFollows = followsAggregation[0]?.totalFollows || 0;

  return {
    totalFollows,
    trendingHashtags: trendingHashtags.map((h) => ({ tag: h._id, count: h.count })),
    mostActiveUsers,
  };
};

/**
 * 9-10. Reports & Moderation Analytics
 */
export const getModerationAnalytics = async ({ start, end }) => {
  const [
    totalReports,
    newReports,
    reportsByReason,
    reportsByStatus,
    actionsByType,
    moderatorLeaderboard,
  ] = await Promise.all([
    Report.countDocuments(),
    Report.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    // Reports by reason
    Report.aggregate([
      { $group: { _id: "$reason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Reports by status
    Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Moderation actions by type
    ModerationLog.aggregate([
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Moderator activity leaderboard
    ModerationLog.aggregate([
      {
        $group: {
          _id: "$moderator",
          actionCount: { $sum: 1 },
        },
      },
      { $sort: { actionCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "moderatorInfo",
        },
      },
      { $unwind: { path: "$moderatorInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          actionCount: 1,
          username: { $ifNull: ["$moderatorInfo.username", "Unknown"] },
          fullname: { $ifNull: ["$moderatorInfo.fullname", "Staff"] },
          role: { $ifNull: ["$moderatorInfo.role", "MODERATOR"] },
        },
      },
    ]),
  ]);

  return {
    totalReports,
    newReports,
    reportsByReason: reportsByReason.map((r) => ({ reason: r._id, count: r.count })),
    reportsByStatus: reportsByStatus.map((r) => ({ status: r._id, count: r.count })),
    actionsByType: actionsByType.map((a) => ({ action: a._id, count: a.count })),
    moderatorLeaderboard,
  };
};

/**
 * Unified Analytics Summary
 */
export const getFullAnalyticsSummary = async ({ timeframe = "7d", startDate, endDate } = {}) => {
  const { start, end } = calculateDateRange({ timeframe, startDate, endDate });

  const [
    userAnalytics,
    postAnalytics,
    engagementAnalytics,
    moderationAnalytics,
  ] = await Promise.all([
    getUserAnalytics({ start, end }),
    getPostAnalytics({ start, end }),
    getEngagementAnalytics({ start, end }),
    getModerationAnalytics({ start, end }),
  ]);

  return {
    timeframe,
    dateRange: {
      start,
      end,
    },
    users: userAnalytics,
    posts: postAnalytics,
    engagement: engagementAnalytics,
    moderation: moderationAnalytics,
  };
};
