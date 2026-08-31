const mongoose = require("mongoose");

// Snapshot of what was ordered — stored as plain values so the order stays
// accurate even if the product is later edited or removed.
const OrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Types.ObjectId, ref: "Product" },
    title: { type: String, required: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    partNumber: { type: String, default: "" },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    // Guest checkout — no login required, contact info captured directly
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },

    items: { type: [OrderItemSchema], required: true },
    total: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "contacted", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", OrderSchema);

module.exports = {
  Order,
};