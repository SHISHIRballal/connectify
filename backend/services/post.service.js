import { v2 as cloudinary } from "cloudinary";
import Post from "../model/post.model.js";
import User from "../model/user.model.js";
import ApiError from "../utils/ApiError.js";
import { encodeCursor, decodeCursor } from "../utils/cursor.js";

/**
 * Fetch feed posts with cursor-based pagination
 */
export const getFeedPosts = async ({ cursor, limit = 10 }) => {
  const filter = {};

  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (!cursorData) {
      throw new ApiError(400, "Invalid pagination cursor");
    }

    filter.$or = [
      { createdAt: { $lt: cursorData.createdAt } },
      { createdAt: cursorData.createdAt, _id: { $lt: cursorData._id } },
    ];
  }

  // Fetch limit + 1 items to determine if a subsequent page exists
  const posts = await Post.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate({
      path: "user",
      select: "username fullname profileimg bio",
    })
    .populate({
      path: "comments.user",
      select: "username fullname profileimg",
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

  const filter = { user: user._id };

  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (!cursorData) {
      throw new ApiError(400, "Invalid pagination cursor");
    }

    filter.$or = [
      { createdAt: { $lt: cursorData.createdAt } },
      { createdAt: cursorData.createdAt, _id: { $lt: cursorData._id } },
    ];
  }

  const posts = await Post.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate({
      path: "user",
      select: "username fullname profileimg bio",
    })
    .populate({
      path: "comments.user",
      select: "username fullname profileimg",
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
 * Create a new post
 */
export const createPost = async ({ userId, text, img }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  let imgUrl = "";
  if (img && img.trim()) {
    const uploadResponse = await cloudinary.uploader.upload(img);
    imgUrl = uploadResponse.secure_url;
  }

  const newPost = new Post({
    user: userId,
    text: text || "",
    img: imgUrl,
  });

  await newPost.save();
  await newPost.populate({
    path: "user",
    select: "username fullname profileimg bio",
  });

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
    // Unlike post
    await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });
    return { liked: false, message: "Post unliked successfully" };
  } else {
    // Like post
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
    select: "username fullname profileimg",
  });

  return post.comments;
};

/**
 * Delete a post
 */
export const deletePost = async ({ userId, postId }) => {
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  if (post.user.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this post");
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
