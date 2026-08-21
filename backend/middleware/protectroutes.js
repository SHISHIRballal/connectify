import jwt from "jsonwebtoken";
import User from "../model/user.model.js";
import ApiError from "../utils/ApiError.js";
import env from "../config/env.js";

/**
 * Authentication Middleware: Verifies JWT token from cookies or Authorization header
 * Blocks suspended users with 403 Forbidden
 */
export const protectRoute = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt;

    // Also check Authorization header Bearer token if cookie is not present
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new ApiError(401, "Not authorized, no token");
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      throw new ApiError(401, "Not authorized, user not found");
    }

    // Check account suspension status
    if (user.isSuspended) {
      throw new ApiError(
        403,
        user.suspensionReason
          ? `Your account has been suspended: ${user.suspensionReason}`
          : "Your account has been suspended. Please contact support."
      );
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Not authorized, token invalid or expired"));
    }
    next(new ApiError(500, "Internal server error"));
  }
};

/**
 * requireAuth: Alias for protectRoute
 */
export const requireAuth = protectRoute;

/**
 * requireRole: Role-Based Authorization Middleware Factory
 * @param  {...string} roles - Allowed roles (e.g. 'ADMIN', 'MODERATOR', 'USER')
 */
export const requireRole = (...roles) => {
  const normalizedAllowedRoles = roles.map((r) => r.toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authorized, no user context"));
    }

    const userRole = (req.user.role || "USER").toUpperCase();

    if (!normalizedAllowedRoles.includes(userRole)) {
      return next(
        new ApiError(403, `Access denied: requires one of [${normalizedAllowedRoles.join(", ")}] permissions`)
      );
    }

    next();
  };
};
