import express from "express";
import { protectRoute, requireRole } from "../middleware/protectroutes.js";
import { validateQuery } from "../middleware/validate.js";
import {
  getFullAnalyticsSummaryController,
  getTrendingHashtagsController,
  getMostActiveUsersController,
} from "../controllers/analytics.controller.js";
import { analyticsQuerySchema } from "../validators/analytics.validator.js";

const router = express.Router();

// All analytics routes require staff permissions (ADMIN or MODERATOR)
router.get(
  "/summary",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  validateQuery(analyticsQuerySchema),
  getFullAnalyticsSummaryController
);

router.get(
  "/hashtags",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  validateQuery(analyticsQuerySchema),
  getTrendingHashtagsController
);

router.get(
  "/active-users",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  validateQuery(analyticsQuerySchema),
  getMostActiveUsersController
);

export default router;
