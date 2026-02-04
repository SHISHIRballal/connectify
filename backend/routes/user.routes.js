import express from "express";
const router = express.Router();

router.get("/profile/:username", getUserProfile);
router.put("/update", updateUserProfile);
router.get("/suggestions", getUserSuggestions);

export default router;
