const mongoose = require("mongoose");

// Cache the connection across invocations — in a serverless environment,
// this module can be re-imported on every request. Without caching,
// every cold-ish invocation would try to open a brand new connection,
// which is slow and can exhaust MongoDB Atlas's connection limit.
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        family: 4, // avoid IPv6 TLS handshake issues on some networks
      })
      .then((mongooseInstance) => {
        console.log("MongoDB connected successfully");
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset so the NEXT request can retry the connection instead of being
    // stuck with a permanently-rejected cached promise.
    cached.promise = null;
    console.error("MongoDB connection error:", error.message);
    // Never call process.exit() here — this runs inside a Vercel
    // serverless function, not a long-lived process. Exiting the process
    // kills the whole function invocation with a raw crash
    // (FUNCTION_INVOCATION_FAILED) instead of a normal error response.
    // Re-throwing lets the calling route's try/catch handle it cleanly.
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;