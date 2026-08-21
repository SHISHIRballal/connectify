import {
  getFullAnalyticsSummary,
  getEngagementAnalytics,
  getUserAnalytics,
  getPostAnalytics,
  getModerationAnalytics,
  calculateDateRange,
} from "../services/analytics.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getFullAnalyticsSummaryController = async (req, res, next) => {
  try {
    const { timeframe, startDate, endDate } = req.query;
    const data = await getFullAnalyticsSummary({ timeframe, startDate, endDate });
    return ApiResponse.success(res, 200, "Analytics summary retrieved successfully", data);
  } catch (error) {
    next(error);
  }
};

export const getTrendingHashtagsController = async (req, res, next) => {
  try {
    const { timeframe, startDate, endDate } = req.query;
    const { start, end } = calculateDateRange({ timeframe, startDate, endDate });
    const data = await getEngagementAnalytics({ start, end });
    return ApiResponse.success(res, 200, "Trending hashtags retrieved successfully", data.trendingHashtags);
  } catch (error) {
    next(error);
  }
};

export const getMostActiveUsersController = async (req, res, next) => {
  try {
    const { timeframe, startDate, endDate } = req.query;
    const { start, end } = calculateDateRange({ timeframe, startDate, endDate });
    const data = await getEngagementAnalytics({ start, end });
    return ApiResponse.success(res, 200, "Most active users retrieved successfully", data.mostActiveUsers);
  } catch (error) {
    next(error);
  }
};
