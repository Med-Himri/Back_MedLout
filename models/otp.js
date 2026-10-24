const mongoose = require("mongoose");

// One pending password-reset code per user. The code itself is stored hashed,
// and MongoDB deletes the document automatically after 15 minutes.
const otpSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      expires: 900,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model("Otp", otpSchema);
