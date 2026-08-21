import {
  getProfileByUsername,
  toggleFollow,
  getSuggestedUsers,
  updateProfile,
} from "../services/user.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await getProfileByUsername(req.params.username);
    return ApiResponse.success(res, 200, "Profile fetched successfully", user);
  } catch (error) {
    next(error);
  }
};

export const followOrUnfollowUser = async (req, res, next) => {
  try {
    const result = await toggleFollow(req.user._id, req.params.id);
    return ApiResponse.success(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

export const getUserSuggestions = async (req, res, next) => {
  try {
    const users = await getSuggestedUsers(req.user._id);
    return ApiResponse.success(
      res,
      200,
      "Suggestions fetched successfully",
      users,
    );
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await updateProfile(req.user._id, req.body);
    return ApiResponse.success(res, 200, "Profile updated successfully", user);
  } catch (error) {
    next(error);
  }
};
