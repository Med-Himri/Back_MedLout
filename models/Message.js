const mongoose = require("mongoose");

// Contact-form messages. The customer's WhatsApp message is still sent; this
// copy lets the team see every request in the admin even if WhatsApp is missed.
const MessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, default: "", maxlength: 30 },
    cityAddress: { type: String, trim: true, default: "", maxlength: 300 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", MessageSchema);

module.exports = { Message };
