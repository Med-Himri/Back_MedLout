const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken } = require("../middlewares/authMiddleware");
const { messageLimiter } = require("../middlewares/rateLimit");
const {
  createMessageCtrl,
  listMessagesCtrl,
  updateMessageCtrl,
  deleteMessageCtrl,
} = require("../controllers/messageController");

const router = express.Router();

router.post("/", messageLimiter, asyncHandler(createMessageCtrl));

router.get("/", verifyToken, asyncHandler(listMessagesCtrl));
router.patch("/:id", verifyToken, asyncHandler(updateMessageCtrl));
router.delete("/:id", verifyToken, asyncHandler(deleteMessageCtrl));

module.exports = router;
