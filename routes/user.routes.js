const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");
const { loginLimiter, passwordResetLimiter } = require("../middlewares/rateLimit");
const {
  login,
  me,
  changeMyPassword,
  forgotPassword,
  resetPassword,
  listStaff,
  createStaff,
  updateStaffRole,
  setStaffPassword,
  deleteStaff,
} = require("../controllers/usercontroller");

const router = express.Router();

/* ================= PUBLIC ================= */
// There is no public sign-up: staff accounts are created by an admin.
router.post("/login", loginLimiter, asyncHandler(login));
router.post("/forgot-password", passwordResetLimiter, asyncHandler(forgotPassword));
router.post("/reset-password", passwordResetLimiter, asyncHandler(resetPassword));

/* ================= SIGNED IN ================= */
router.get("/me", verifyToken, asyncHandler(me));
router.post("/change-password", verifyToken, asyncHandler(changeMyPassword));

/* ================= ADMIN ONLY ================= */
router.get("/staff", verifyToken, requireAdmin, asyncHandler(listStaff));
router.post("/staff", verifyToken, requireAdmin, asyncHandler(createStaff));
router.patch("/staff/:id", verifyToken, requireAdmin, asyncHandler(updateStaffRole));
router.post("/staff/:id/password", verifyToken, requireAdmin, asyncHandler(setStaffPassword));
router.delete("/staff/:id", verifyToken, requireAdmin, asyncHandler(deleteStaff));

module.exports = router;
