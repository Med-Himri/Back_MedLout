const crypto = require("crypto");
const mongoose = require("mongoose");
const { Order, ORDER_STATUSES } = require("../models/Order");
const { Product } = require("../models/Product");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const text = (value, max) => String(value ?? "").trim().slice(0, max);
const round2 = (n) => Math.round(n * 100) / 100;

// e.g. "ML-7K2QX9" — no 0/O/1/I so it can be read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const newOrderNumber = () =>
  "ML-" + Array.from({ length: 6 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join("");

const unitPrice = (product) =>
  product.discountPrice > 0 && product.discountPrice < product.price
    ? product.discountPrice
    : product.price;

/** --------------------------------------------------
 * @desc    Create a new order (guest checkout — no login required)
 *          Prices and total are computed here from the database; whatever
 *          the browser sends as price/total is ignored.
 * @route   POST /api/order/create
 * @access  Public
 -------------------------------------------------- **/
exports.createOrderCtrl = async (req, res) => {
  const customerName = text(req.body.customerName, 100);
  const phone = text(req.body.phone, 30);
  const city = text(req.body.city, 100);
  const address = text(req.body.address, 300);
  const notes = text(req.body.notes, 1000);
  const items = req.body.items;

  if (customerName.length < 2 || !/^[+\d][\d\s().-]{5,}$/.test(phone)) {
    return res.status(400).json({ message: "Le nom et un numéro de téléphone valide sont requis" });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ message: "La commande doit contenir au moins un article" });
  }

  // Merge duplicate lines and validate ids / quantities
  const wanted = new Map();
  for (const item of items) {
    const id = String(item?.product || item?.id || "");
    const qty = Math.floor(Number(item?.quantity));
    if (!mongoose.isValidObjectId(id) || !(qty >= 1 && qty <= 99)) {
      return res.status(400).json({ message: "Article ou quantité invalide dans le panier" });
    }
    wanted.set(id, Math.min(99, (wanted.get(id) || 0) + qty));
  }

  const products = await Product.find({ _id: { $in: [...wanted.keys()] }, accepted: true })
    .select("title slug price discountPrice stock mainImage")
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const [id, quantity] of wanted) {
    const product = byId.get(id);
    if (!product) {
      return res.status(400).json({
        message: "Un article de votre panier n'est plus disponible. Retirez-le puis réessayez.",
        unavailable: id,
      });
    }
    if (product.stock === "out_of_stock") {
      return res.status(400).json({
        message: `« ${product.title} » est en rupture de stock. Retirez-le puis réessayez.`,
        unavailable: id,
      });
    }
    lines.push({
      product: product._id,
      title: product.title,
      slug: product.slug,
      image: product.mainImage?.url || "",
      price: unitPrice(product),
      quantity,
    });
  }

  const total = round2(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));

  // Retry on the (very unlikely) order-number collision
  let order;
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    try {
      order = await Order.create({
        orderNumber: newOrderNumber(),
        customerName,
        phone,
        city,
        address,
        notes,
        items: lines,
        total,
        status: "pending",
      });
    } catch (error) {
      if (error.code !== 11000 || attempt === 2) throw error;
    }
  }

  res.status(201).json({
    message: "Commande créée avec succès",
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      phone: order.phone,
      city: order.city,
      address: order.address,
      notes: order.notes,
      items: order.items,
      total: order.total,
    },
  });
};

/** --------------------------------------------------
 * @desc    List orders with optional status filter and search
 * @route   GET /api/order?status=pending&q=...&page=1
 * @access  Private (staff / admin)
 -------------------------------------------------- **/
exports.getOrdersCtrl = async (req, res) => {
  const filter = {};
  if (ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;

  const q = text(req.query.q, 60);
  if (q) {
    const re = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ orderNumber: re }, { customerName: re }, { phone: re }, { city: re }];
  }

  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const page = Math.max(1, Number(req.query.page) || 1);

  const [orders, total, counts] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);

  res.status(200).json({
    orders,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
  });
};

/** --------------------------------------------------
 * @route   GET /api/order/:id
 * @access  Private (staff / admin)
 -------------------------------------------------- **/
exports.getOrderCtrl = async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ message: "Commande introuvable" });
  res.status(200).json(order);
};

/** --------------------------------------------------
 * @desc    Update order status and/or the private team note
 * @route   PATCH /api/order/:id
 * @access  Private (staff / admin)
 -------------------------------------------------- **/
exports.updateOrderCtrl = async (req, res) => {
  const update = {};
  if (req.body.status !== undefined) {
    if (!ORDER_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }
    update.status = req.body.status;
  }
  if (req.body.adminNote !== undefined) update.adminNote = text(req.body.adminNote, 2000);

  const order = await Order.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  }).lean();
  if (!order) return res.status(404).json({ message: "Commande introuvable" });

  res.status(200).json({ message: "Commande mise à jour", order });
};

/** --------------------------------------------------
 * @route   DELETE /api/order/:id
 * @access  Private (admin only) — e.g. spam / test orders
 -------------------------------------------------- **/
exports.deleteOrderCtrl = async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) return res.status(404).json({ message: "Commande introuvable" });
  res.status(200).json({ message: "Commande supprimée" });
};
