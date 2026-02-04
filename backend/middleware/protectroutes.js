import User from "../model/user.model.js";
import jwt from "jsonwebtoken";
export const protectroutes = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ error: "Not authorized, no token" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: "Not authorized, invalid token" });
    }
    const user = await User.findById(decoded.user).select("-password");
    if (!user) {
      return res.status(401).json({ error: "Not authorized, user not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("error in protectroutes middleware", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
