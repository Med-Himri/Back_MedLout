const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");
const { orderLimiter } = require("../middlewares/rateLimit");
const {
  createOrderCtrl,
  getOrdersCtrl,
  getOrderCtrl,
  updateOrderCtrl,
  deleteOrderCtrl,
} = require("../controllers/orderController");

const router = express.Router();

/* ================= PUBLIC ================= */
// Guest checkout — the order is saved, then the customer sends it on WhatsApp
router.post("/create", orderLimiter, asyncHandler(createOrderCtrl));

/* ================= STAFF / ADMIN ================= */
router.get("/", verifyToken, asyncHandler(getOrdersCtrl));
router.get("/:id", verifyToken, asyncHandler(getOrderCtrl));
router.patch("/:id", verifyToken, asyncHandler(updateOrderCtrl));
router.delete("/:id", verifyToken, requireAdmin, asyncHandler(deleteOrderCtrl));

module.exports = router;
