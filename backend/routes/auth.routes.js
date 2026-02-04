import express from "express";
import {
  signup,
  login,
  logout,
  getme,
} from "../controllers/auth.controller.js";
import { protectroutes } from "../middleware/protectroutes.js";

const router = express.Router();

router.get("/me", protectroutes, getme);

router.post("/signup", signup);

router.post("/login", login);

router.post("/logout", logout);

export default router;
