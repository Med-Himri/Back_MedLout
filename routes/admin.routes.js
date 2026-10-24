const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { verifyToken } = require("../middlewares/authMiddleware");
const { getDashboardCtrl } = require("../controllers/adminController");

const router = express.Router();

router.get("/dashboard", verifyToken, asyncHandler(getDashboardCtrl));

module.exports = router;
