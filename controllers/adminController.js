const { Order } = require("../models/Order");
const { Product } = require("../models/Product");
const { Message } = require("../models/Message");

// Statuses that count as real sales (the customer confirmed on the phone)
const SOLD = ["confirmed", "shipped", "delivered"];
const OPEN = ["pending", "contacted", "confirmed", "shipped"];

/** --------------------------------------------------
 * @desc    Everything the admin dashboard home page shows, in one request
 * @route   GET /api/admin/dashboard
 * @access  Private (staff / admin)
 -------------------------------------------------- **/
exports.getDashboardCtrl = async (req, res) => {
  const [
    orderCount,
    statusCounts,
    revenue,
    productCount,
    hiddenProducts,
    aiDrafts,
    outOfStock,
    recentOrders,
    recentMessages,
    unreadMessages,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $in: SOLD } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Product.countDocuments(),
    Product.countDocuments({ accepted: false }),
    Product.countDocuments({ accepted: false, aiGenerated: true }),
    Product.find({ stock: "out_of_stock" }).select("title slug").limit(10).lean(),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select("orderNumber customerName phone total status createdAt")
      .lean(),
    Message.find().sort({ createdAt: -1 }).limit(4).lean(),
    Message.countDocuments({ read: false }),
  ]);

  const counts = Object.fromEntries(statusCounts.map((c) => [c._id, c.n]));

  res.status(200).json({
    orderCount,
    counts,
    toCall: counts.pending || 0,
    openOrders: OPEN.reduce((sum, s) => sum + (counts[s] || 0), 0),
    revenue: revenue[0]?.total || 0,
    productCount,
    hiddenProducts,
    aiDrafts,
    outOfStock,
    recentOrders,
    recentMessages,
    unreadMessages,
  });
};
