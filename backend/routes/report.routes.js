import express from "express";
import { protectRoute } from "../middleware/protectroutes.js";
import validate from "../middleware/validate.js";
import { createReportController } from "../controllers/report.controller.js";
import { createReportSchema } from "../validators/report.validator.js";

const router = express.Router();

router.post("/", protectRoute, validate(createReportSchema), createReportController);

export default router;
