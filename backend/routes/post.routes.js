import express from "express";
import { protectRoute } from "../middleware/protectroutes.js";
import {
  getFeedPostsController,
  getUserPostsController,
  createPostController,
  likeUnlikePostController,
  commentOnPostController,
  deletePostController,
} from "../controllers/post.controller.js";
import validate, {
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  createPostSchema,
  feedQuerySchema,
  commentSchema,
  postIdParamSchema,
} from "../validators/post.validator.js";

const router = express.Router();

router.get("/feed", protectRoute, validateQuery(feedQuerySchema), getFeedPostsController);

router.get(
  "/user/:username",
  protectRoute,
  validateQuery(feedQuerySchema),
  getUserPostsController
);

router.post(
  "/create",
  protectRoute,
  validate(createPostSchema),
  createPostController
);

router.post(
  "/like/:id",
  protectRoute,
  validateParams(postIdParamSchema),
  likeUnlikePostController
);

router.post(
  "/comment/:id",
  protectRoute,
  validateParams(postIdParamSchema),
  validate(commentSchema),
  commentOnPostController
);

router.delete(
  "/:id",
  protectRoute,
  validateParams(postIdParamSchema),
  deletePostController
);

export default router;
