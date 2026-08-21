import express from "express";
import { protectRoute } from "../middleware/protectroutes.js";
import {
  getUserProfile,
  followOrUnfollowUser,
  getUserSuggestions,
  updateUserProfile,
} from "../controllers/user.controller.js";
import validate, { validateParams } from "../middleware/validate.js";
import {
  updateProfileSchema,
  followParamsSchema,
  profileParamsSchema,
} from "../validators/user.validator.js";

const router = express.Router();

router.get(
  "/profile/:username",
  protectRoute,
  validateParams(profileParamsSchema),
  getUserProfile,
);
router.get("/suggestions", protectRoute, getUserSuggestions);
router.post(
  "/follow/:id",
  protectRoute,
  validateParams(followParamsSchema),
  followOrUnfollowUser,
);
router.post(
  "/update",
  protectRoute,
  validate(updateProfileSchema),
  updateUserProfile,
);

export default router;
