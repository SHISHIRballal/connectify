import {
  getFeedPosts,
  getUserPosts,
  createPost,
  likeUnlikePost,
  commentOnPost,
  deletePost,
} from "../services/post.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getFeedPostsController = async (req, res, next) => {
  try {
    const { cursor, limit } = req.validatedQuery || req.query;
    const data = await getFeedPosts({
      cursor,
      limit: limit ? parseInt(limit, 10) : 10,
    });
    return ApiResponse.success(res, 200, "Feed fetched successfully", data);
  } catch (error) {
    next(error);
  }
};

export const getUserPostsController = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { cursor, limit } = req.validatedQuery || req.query;
    const data = await getUserPosts({
      username,
      cursor,
      limit: limit ? parseInt(limit, 10) : 10,
    });
    return ApiResponse.success(res, 200, "User posts fetched successfully", data);
  } catch (error) {
    next(error);
  }
};

export const createPostController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { text, img } = req.body;
    const newPost = await createPost({ userId, text, img });
    return ApiResponse.success(res, 201, "Post created successfully", newPost);
  } catch (error) {
    next(error);
  }
};

export const likeUnlikePostController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;
    const result = await likeUnlikePost({ userId, postId });
    return ApiResponse.success(res, 200, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const commentOnPostController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;
    const { text } = req.body;
    const comments = await commentOnPost({ userId, postId, text });
    return ApiResponse.success(res, 200, "Comment added successfully", comments);
  } catch (error) {
    next(error);
  }
};

export const deletePostController = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const postId = req.params.id;
    const result = await deletePost({ userId, postId });
    return ApiResponse.success(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};
