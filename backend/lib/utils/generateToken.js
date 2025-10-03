import jwt from "jsonwebtoken";
export const generatetokenandsetcookie = (user, res) => {
  const token = jwt.sign({ user }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });

  res.cookie("jwt", token, {
    httpOnly: true, // Prevents client-side JS from accessing the cookie
    secure: true, // Ensures cookie is sent only over HTTPS
    sameSite: "Strict", // Helps prevent CSRF attacks
    maxAge: 24 * 60 * 60 * 1000, // Optional: cookie expiration in ms (1 day here)
    secure: process.env.NODE_ENV !== "development", // Set secure flag in production
  });
};
