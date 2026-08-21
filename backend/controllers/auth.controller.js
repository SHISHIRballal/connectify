import {
  createUser,
  authenticateUser,
  getUserById,
} from "../services/auth.service.js";
import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import ApiResponse from "../utils/ApiResponse.js";

export const signup = async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    generateTokenAndSetCookie(user._id, res);
    return ApiResponse.success(res, 201, "User created successfully", user);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const user = await authenticateUser(req.body);
    generateTokenAndSetCookie(user._id, res);
    return ApiResponse.success(res, 200, "Logged in successfully", user);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    return ApiResponse.success(res, 200, "Logged out successfully");
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await getUserById(req.user._id);
    return ApiResponse.success(res, 200, "User fetched successfully", user);
  } catch (error) {
    next(error);
  }
};
