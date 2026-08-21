import express from "express";
import { protectRoute } from "../middleware/protectroutes.js";
import {
  sendMessageController,
  getMessagesController,
  getConversationsController,
  markAsReadController,
} from "../controllers/message.controller.js";
import validate, { validateParams } from "../middleware/validate.js";
import {
  sendMessageSchema,
  messageParamsSchema,
} from "../validators/message.validator.js";

const router = express.Router();

router.get("/conversations", protectRoute, getConversationsController);

router.get(
  "/:id",
  protectRoute,
  validateParams(messageParamsSchema),
  getMessagesController
);

router.post(
  "/send/:id",
  protectRoute,
  validateParams(messageParamsSchema),
  validate(sendMessageSchema),
  sendMessageController
);

router.post(
  "/read/:id",
  protectRoute,
  validateParams(messageParamsSchema),
  markAsReadController
);

export default router;
