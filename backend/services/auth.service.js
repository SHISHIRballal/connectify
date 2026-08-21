import bcrypt from "bcryptjs";
import User from "../model/user.model.js";
import ApiError from "../utils/ApiError.js";

export const createUser = async ({ fullname, username, email, password, role = "USER" }) => {
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    throw new ApiError(400, "Username already taken");
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new ApiError(400, "Email already registered");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    fullname,
    username,
    email,
    password: hashedPassword,
    role: (role || "USER").toUpperCase(),
  });

  await newUser.save();

  const userResponse = newUser.toObject();
  delete userResponse.password;
  return userResponse;
};

export const authenticateUser = async ({ username, password }) => {
  const user = await User.findOne({ username });
  if (!user) {
    throw new ApiError(400, "Invalid credentials");
  }

  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid credentials");
  }

  // Check suspension
  if (user.isSuspended) {
    throw new ApiError(
      403,
      user.suspensionReason
        ? `Your account has been suspended: ${user.suspensionReason}`
        : "Your account has been suspended. Please contact support."
    );
  }

  const userResponse = user.toObject();
  delete userResponse.password;
  return userResponse;
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
};
