import bcryptjs from "bcryptjs";
import User from "../model/user.model.js";
export const getUserProfile = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error in getUserProfile controller", error.message);
    res.status(500).json("internal server error", error);
  }
};

export const followunfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const usertomodify = await User.findById(id);
    const currentuser = await User.findById(req.user._id);
    if (!usertomodify || !currentuser) {
      return res.status(400).json({ error: "User not found" });
    }
    if (req.user._id.toString() === id) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }
    const isfollowing = currentuser.following.includes(id);
    if (isfollowing) {
      // Unfollow user
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // Follow user
      await User.findByIdAndUpdate(id, {
        $push: { followers: req.user._id },
      });
      await User.findByIdAndUpdate(req.user._id, { following: id });
      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    console.error("Error in followunfollowUser controller", error.message);
    res.status(500).json("internal server error", error);
  }
};

export const getUserSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;

    const userfollowedbyme = await User.findById(userId).select("following");

    const users = await User.aggregate([
      {
        $match: {
          _id: {
            $ne: userId,
          },
        },
      },
      { $sample: { size: 10 } },
    ]);

    res.status(200).json(users);
    const suggestions = users.filter(
      (user) => !userfollowedbyme.following.includes(user._id),
    );
    const limitedSuggestions = suggestions.slice(0, 5);
    limitedSuggestions.forEach((suggestion) => (user.password = null));
    res.status(200).json(limitedSuggestions);
  } catch (error) {
    console.error("Error in getUserSuggestions controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  const { username, fullname, email, currentPassword, newPassword, bio, line } =
    req.body;
  let { profileimg, coverimg } = req.body;

  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (
      (!currentPassword && newPassword) ||
      (currentPassword && !newPassword)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Both current and new passwords are required to update password",
        });
    }
    if (currentPassword && newPassword) {
      const isMatch = await bcryptjs.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "New password must be at least 6 characters long" });
      }

      const salt = await bcryptjs.genSalt(10);
      user.password = await bcryptjs.hash(newPassword, salt);
    }
  } catch (error) {
    console.error("Error in updateUserProfile controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
