const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const router = express.Router();

const {
  createOrderCtrl,
  getOrdersCtrl,
  updateOrderStatusCtrl,
} = require("../controllers/orderController");

/* ================= PUBLIC ROUTES ================= */
// Guest checkout — no login required, WhatsApp handoff
router.post("/create", createOrderCtrl);

/* ================= PROTECTED ROUTES (admin/staff) ================= */
router.use(verifyToken);
router.get("/getorders", getOrdersCtrl);
router.post("/updatestatus", updateOrderStatusCtrl);

module.exports = router;

// Mount this in your main server file alongside your existing routes:
// const orderRoutes = require("./routes/order.routes");
// app.use("/api/order", orderRoutes);