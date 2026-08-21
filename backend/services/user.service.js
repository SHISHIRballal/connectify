import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import User from "../model/user.model.js";
import ApiError from "../utils/ApiError.js";

export const getProfileByUsername = async (username) => {
  const user = await User.findOne({ username }).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
};

export const toggleFollow = async (currentUserId, targetUserId) => {
  if (currentUserId.toString() === targetUserId) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  const targetUser = await User.findById(targetUserId);
  const currentUser = await User.findById(currentUserId);

  if (!targetUser || !currentUser) {
    throw new ApiError(404, "User not found");
  }

  const isFollowing = currentUser.following.includes(targetUserId);

  if (isFollowing) {
    // Unfollow
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: currentUserId },
    });
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: targetUserId },
    });
    return { followed: false, message: "User unfollowed successfully" };
  } else {
    // Follow — fixed: uses $push instead of overwriting the array
    await User.findByIdAndUpdate(targetUserId, {
      $push: { followers: currentUserId },
    });
    await User.findByIdAndUpdate(currentUserId, {
      $push: { following: targetUserId },
    });
    return { followed: true, message: "User followed successfully" };
  }
};

export const getSuggestedUsers = async (userId) => {
  const currentUser = await User.findById(userId).select("following");

  const users = await User.aggregate([
    {
      $match: {
        _id: {
          $nin: [...currentUser.following, userId],
        },
      },
    },
    { $sample: { size: 5 } },
    { $project: { password: 0 } },
  ]);

  return users;
};

export const updateProfile = async (userId, updateData) => {
  const { username, fullname, email, currentPassword, newPassword, bio, link } =
    updateData;
  let { profileimg, coverimg } = updateData;

  let user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Handle password change
  if (currentPassword && newPassword) {
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new ApiError(400, "Current password is incorrect");
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
  }

  // Handle profile image upload — fixed: null-check before split()
  if (profileimg) {
    if (user.profileimg) {
      const publicId = user.profileimg.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }
    const uploadedResponse = await cloudinary.uploader.upload(profileimg);
    profileimg = uploadedResponse.secure_url;
  }

  // Handle cover image upload — fixed: null-check before split()
  if (coverimg) {
    if (user.coverimg) {
      const publicId = user.coverimg.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }
    const uploadedResponse = await cloudinary.uploader.upload(coverimg);
    coverimg = uploadedResponse.secure_url;
  }

  user.username = username || user.username;
  user.fullname = fullname || user.fullname;
  user.email = email || user.email;
  user.bio = bio || user.bio;
  user.link = link || user.link;
  user.profileimg = profileimg || user.profileimg;
  user.coverimg = coverimg || user.coverimg;

  user = await user.save();

  const userResponse = user.toObject();
  delete userResponse.password;
  return userResponse;
};
