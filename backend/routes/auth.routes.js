import express from "express";
import {
  signup,
  login,
  logout,
  getMe,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/protectroutes.js";
import validate from "../middleware/validate.js";
import { signupSchema, loginSchema } from "../validators/auth.validator.js";

const router = express.Router();

router.get("/me", protectRoute, getMe);
router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);

export default router;
