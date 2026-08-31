const { Order } = require("../models/Order");
const User = require("../models/User");

/** --------------------------------------------------
 * @desc    Create a new order (guest checkout — no login required)
 * @route   POST /api/order/create
 * @access  Public
 -------------------------------------------------- **/
exports.createOrderCtrl = async (req, res) => {
  const { customerName, phone, city, address, notes, items, total } = req.body;

  try {
    if (!customerName || !phone) {
      return res.status(400).json({ message: "Le nom et le numéro de téléphone sont requis" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "La commande doit contenir au moins un article" });
    }

    const newOrder = await Order.create({
      customerName,
      phone,
      city,
      address,
      notes,
      items,
      total,
      status: "pending",
    });

    res.status(201).json({ message: "Commande créée avec succès", order: newOrder });
  } catch (error) {
    console.error("Erreur lors de la création de la commande:", error);
    res.status(500).json({ message: "Erreur lors de la création de la commande", error: error.message });
  }
};

/** --------------------------------------------------
 * @desc    Get all orders (admin/staff only)
 * @route   GET /api/order/getorders
 * @access  Private (staff / admin)
 -------------------------------------------------- **/
exports.getOrdersCtrl = async (req, res) => {
  const user = req.id;

  try {
    const staff = await User.findById(user);
    if (!staff) {
      return res.status(403).json({ message: "Accès refusé. Staff ou admin uniquement." });
    }

    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des commandes", error: error.message });
  }
};

/** --------------------------------------------------
 * @desc    Update order status (admin/staff only)
 * @route   POST /api/order/updatestatus
 * @access  Private (staff / admin)
 -------------------------------------------------- **/
exports.updateOrderStatusCtrl = async (req, res) => {
  const user = req.id;
  const { id, status } = req.body;

  try {
    const staff = await User.findById(user);
    if (!staff) {
      return res.status(403).json({ message: "Accès refusé. Staff ou admin uniquement." });
    }

    if (!id || !status) {
      return res.status(400).json({ message: "L'id et le statut de la commande sont requis" });
    }

    const validStatuses = ["pending", "contacted", "confirmed", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!updatedOrder) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    res.status(200).json({ message: "Statut de la commande mis à jour", order: updatedOrder });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du statut", error: error.message });
  }
};