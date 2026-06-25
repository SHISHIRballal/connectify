import express from "express";
import { protectroutes } from "../middleware/protectroutes.js";
import {
  getUserProfile,
  followunfollowUser,
  getUserSuggestions,
  updateUserProfile,
} from "../controllers/user.controller.js";
const router = express.Router();

router.get("/profile/:username", protectroutes, getUserProfile);
router.post("/update", protectroutes, updateUserProfile);
router.post("/suggestions", protectroutes, getUserSuggestions);
router.post("/follow/:id", protectroutes, followunfollowUser);

export default router;
