const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // Forces the connection to use IPv4 instead of IPv6. On Windows,
      // IPv6 connectivity to Atlas is a well-documented cause of
      // intermittent TLS handshake failures (the "tlsv1 alert internal
      // error" / "SSL alert number 80" error) — this resolves it for
      // many developers without needing any other change.
      family: 4,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;