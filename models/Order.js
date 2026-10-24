const mongoose = require("mongoose");

const ORDER_STATUSES = ["pending", "contacted", "confirmed", "shipped", "delivered", "cancelled"];

// Snapshot of what was ordered — stored as plain values so the order stays
// accurate even if the product is later edited or removed.
const OrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Types.ObjectId, ref: "Product" },
    title: { type: String, required: true },
    slug: { type: String, default: "" },
    image: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    partNumber: { type: String, default: "" },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    // Short human-readable reference, also written in the WhatsApp message so
    // a WhatsApp conversation can be matched to the order in the admin.
    // Orders created before this field existed don't have one (sparse index).
    orderNumber: { type: String, unique: true, sparse: true },

    // Guest checkout — no login required, contact info captured directly
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    city: { type: String, trim: true, default: "", maxlength: 100 },
    address: { type: String, trim: true, default: "", maxlength: 300 },
    notes: { type: String, trim: true, default: "", maxlength: 1000 },

    items: { type: [OrderItemSchema], required: true },
    total: { type: Number, required: true },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },
    // Private note for the team (never shown to the customer)
    adminNote: { type: String, trim: true, default: "", maxlength: 2000 },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", OrderSchema);

module.exports = {
  Order,
  ORDER_STATUSES,
};
