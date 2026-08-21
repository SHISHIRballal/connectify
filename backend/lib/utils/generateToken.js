import jwt from "jsonwebtoken";
import env from "../../config/env.js";

export const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: "15d",
  });

  res.cookie("jwt", token, {
    httpOnly: true, // Prevents client-side JS from accessing the cookie
    sameSite: "strict", // Helps prevent CSRF attacks
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days — matches JWT expiry
    secure: env.NODE_ENV !== "development", // HTTPS only in production
  });
};
