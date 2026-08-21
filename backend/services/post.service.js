import { v2 as cloudinary } from "cloudinary";
import Post from "../model/post.model.js";
import User from "../model/user.model.js";
import Report from "../model/report.model.js";
import ModerationLog from "../model/moderationLog.model.js";
import ApiError from "../utils/ApiError.js";
import { encodeCursor, decodeCursor } from "../utils/cursor.js";
import { moderatePostContent } from "./ai/moderationService.js";

/**
 * Fetch feed posts with cursor-based pagination
 */
export const getFeedPosts = async ({ cursor, limit = 10 }) => {
  // Exclude blocked posts from public feed
  const filter = { moderationStatus: { $ne: "BLOCKED" } };

  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (!cursorData) {
      throw new ApiError(400, "Invalid pagination cursor");
    }

    filter.$and = [
      { moderationStatus: { $ne: "BLOCKED" } },
      {
        $or: [
          { createdAt: { $lt: cursorData.createdAt } },
          { createdAt: cursorData.createdAt, _id: { $lt: cursorData._id } },
        ],
      },
    ];
    delete filter.moderationStatus;
  }

  // Fetch limit + 1 items to determine if a subsequent page exists
  const posts = await Post.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate({
      path: "user",
      select: "username fullname profileimg bio role isSuspended",
    })
    .populate({
      path: "comments.user",
      select: "username fullname profileimg role",
    });

  let hasNextPage = false;
  let nextCursor = null;

  if (posts.length > limit) {
    hasNextPage = true;
    posts.pop(); // Remove extra peek element
    const lastItem = posts[posts.length - 1];
    nextCursor = encodeCursor({
      createdAt: lastItem.createdAt,
      _id: lastItem._id,
    });
  }

  return {
    posts,
    nextCursor,
    hasNextPage,
    limit,
  };
};

/**
 * Fetch posts for a specific user profile
 */
export const getUserPosts = async ({ username, cursor, limit = 10 }) => {
  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const filter = { user: user._id, moderationStatus: { $ne: "BLOCKED" } };

  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (!cursorData) {
      throw new ApiError(400, "Invalid pagination cursor");
    }

    filter.$and = [
      { user: user._id, moderationStatus: { $ne: "BLOCKED" } },
      {
        $or: [
          { createdAt: { $lt: cursorData.createdAt } },
          { createdAt: cursorData.createdAt, _id: { $lt: cursorData._id } },
        ],
      },
    ];
    delete filter.user;
    delete filter.moderationStatus;
  }

  const posts = await Post.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate({
      path: "user",
      select: "username fullname profileimg bio role isSuspended",
    })
    .populate({
      path: "comments.user",
      select: "username fullname profileimg role",
    });

  let hasNextPage = false;
  let nextCursor = null;

  if (posts.length > limit) {
    hasNextPage = true;
    posts.pop();
    const lastItem = posts[posts.length - 1];
    nextCursor = encodeCursor({
      createdAt: lastItem.createdAt,
      _id: lastItem._id,
    });
  }

  return {
    posts,
    nextCursor,
    hasNextPage,
    limit,
  };
};

/**
 * Create a new post with integrated AI content moderation
 */
export const createPost = async ({ userId, text, img }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 1. Run content through AI Moderation Service & Deterministic Policy Engine
  const moderationResult = await moderatePostContent(text, img);

  // 2. Handle HIGH RISK -> BLOCKED
  if (moderationResult.moderationStatus === "BLOCKED") {
    // Record audit log for security analytics
    await ModerationLog.create({
      moderator: userId,
      action: "DELETE_POST",
      targetType: "POST",
      targetId: userId,
      details: {
        action: "AUTO_BLOCKED_BY_AI_POLICY",
        riskScore: moderationResult.moderationScore,
        categories: moderationResult.moderationCategories,
        reason: moderationResult.moderationReason,
        blockedText: text,
      },
    }).catch((err) => console.warn("Failed to log blocked post:", err.message));

    throw new ApiError(
      400,
      `Your post was blocked by automated safety policies: ${moderationResult.moderationReason}`
    );
  }

  let imgUrl = "";
  if (img && img.trim()) {
    const uploadResponse = await cloudinary.uploader.upload(img);
    imgUrl = uploadResponse.secure_url;
  }

  // 3. Create post with assigned moderation status
  const newPost = new Post({
    user: userId,
    text: text || "",
    img: imgUrl,
    moderationStatus: moderationResult.moderationStatus,
    moderationScore: moderationResult.moderationScore,
    moderationCategories: moderationResult.moderationCategories,
    moderationReason: moderationResult.moderationReason,
    moderatedAt: moderationResult.moderatedAt,
  });

  await newPost.save();
  await newPost.populate({
    path: "user",
    select: "username fullname profileimg bio role",
  });

  // 4. Handle MEDIUM RISK -> FLAGGED (Auto-create report for moderator triage)
  if (moderationResult.moderationStatus === "FLAGGED") {
    const primaryReason = moderationResult.moderationCategories[0] || "other";
    const mappedReason = [
      "spam",
      "harassment",
      "hate_speech",
      "inappropriate",
      "violence",
      "other",
    ].includes(primaryReason)
      ? primaryReason
      : "inappropriate";

    await Report.create({
      reporter: userId,
      reportedUser: userId,
      reportedPost: newPost._id,
      reason: mappedReason,
      details: `[AI Auto-Flagged | Risk Score: ${Math.round(moderationResult.moderationScore * 100)}%] ${moderationResult.moderationReason}`,
      status: "PENDING",
    }).catch((err) => console.warn("Failed to auto-create report for flagged post:", err.message));
  }

  return newPost;
};

/**
 * Toggle like / unlike on a post
 */
export const likeUnlikePost = async ({ userId, postId }) => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const isLiked = post.likes.some((id) => id.toString() === userId.toString());

  if (isLiked) {
    await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });
    return { liked: false, message: "Post unliked successfully" };
  } else {
    await Post.findByIdAndUpdate(postId, { $push: { likes: userId } });
    return { liked: true, message: "Post liked successfully" };
  }
};

/**
 * Add a comment to a post
 */
export const commentOnPost = async ({ userId, postId, text }) => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const comment = {
    text,
    user: userId,
    createdAt: new Date(),
  };

  post.comments.push(comment);
  await post.save();

  await post.populate({
    path: "comments.user",
    select: "username fullname profileimg role",
  });

  return post.comments;
};

/**
 * Delete a post (Allowed for author OR Moderator/Admin)
 */
export const deletePost = async ({ user, postId }) => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const userId = (user._id || user).toString();
  const userRole = (user.role || "USER").toUpperCase();
  const isOwner = post.user.toString() === userId;
  const isModOrAdmin = ["MODERATOR", "ADMIN"].includes(userRole);

  if (!isOwner && !isModOrAdmin) {
    throw new ApiError(403, "You are not authorized to delete this post");
  }

  if (!isOwner && isModOrAdmin) {
    await ModerationLog.create({
      moderator: user._id,
      action: "DELETE_POST",
      targetType: "POST",
      targetId: postId,
      details: {
        postAuthor: post.user,
        postText: post.text,
        hadImage: !!post.img,
        deletedByRole: userRole,
      },
    });
  }

  if (post.img) {
    try {
      const publicId = post.img.split("/").pop().split(".")[0];
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (err) {
      console.error("Error deleting image from Cloudinary:", err.message);
    }
  }

  await Post.findByIdAndDelete(postId);
  return { message: "Post deleted successfully" };
};
