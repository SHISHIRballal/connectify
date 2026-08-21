import express from "express";
import { protectRoute, requireRole } from "../middleware/protectroutes.js";
import validate, { validateParams, validateQuery } from "../middleware/validate.js";
import {
  getDashboardOverviewController,
  getUsersController,
  getAdminPostsController,
  getPostReportsController,
  suspendUserController,
  activateUserController,
  changeRoleController,
  getReportsController,
  resolveReportController,
  getModerationLogsController,
  getDashboardAnalyticsController,
} from "../controllers/admin.controller.js";
import {
  adminUserIdParamSchema,
  adminReportIdParamSchema,
  adminPostIdParamSchema,
  adminUsersQuerySchema,
  adminPostsQuerySchema,
  adminReportsQuerySchema,
  suspendUserSchema,
  changeRoleSchema,
  resolveReportSchema,
} from "../validators/admin.validator.js";

const router = express.Router();

// 1. Overview
router.get(
  "/overview",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  getDashboardOverviewController
);

// 2. User Management
router.get(
  "/users",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  validateQuery(adminUsersQuerySchema),
  getUsersController
);

router.post(
  "/users/:id/suspend",
  protectRoute,
  requireRole("ADMIN"),
  validateParams(adminUserIdParamSchema),
  validate(suspendUserSchema),
  suspendUserController
);

router.post(
  "/users/:id/activate",
  protectRoute,
  requireRole("ADMIN"),
  validateParams(adminUserIdParamSchema),
  activateUserController
);

router.post(
  "/users/:id/role",
  protectRoute,
  requireRole("ADMIN"),
  validateParams(adminUserIdParamSchema),
  validate(changeRoleSchema),
  changeRoleController
);

// 3. Post Management
router.get(
  "/posts",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  validateQuery(adminPostsQuerySchema),
  getAdminPostsController
);

router.get(
  "/posts/:id/reports",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  validateParams(adminPostIdParamSchema),
  getPostReportsController
);

// 4. Reports Management
router.get(
  "/reports",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  validateQuery(adminReportsQuerySchema),
  getReportsController
);

router.post(
  "/reports/:id/resolve",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  validateParams(adminReportIdParamSchema),
  validate(resolveReportSchema),
  resolveReportController
);

// 5. Moderation Audit Logs
router.get(
  "/logs",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  getModerationLogsController
);

// 6. Analytics
router.get(
  "/analytics",
  protectRoute,
  requireRole("ADMIN", "MODERATOR"),
  getDashboardAnalyticsController
);

export default router;
