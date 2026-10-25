// Load env vars FIRST, before anything that might read process.env at import time
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/config");
const { notFound, errorHandler } = require("./middlewares/errorHandler");

const app = express();

// Vercel (and Docker behind a proxy) forwards the client IP in X-Forwarded-For;
// rate limiting needs the real IP.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Extra origins can be added without a code change: ALLOWED_ORIGINS=https://a.com,https://b.com
const allowedOrigins = [
  "http://localhost:3000",
  "https://front-med-lout.vercel.app",
  "https://medloutauto.com",
  "https://www.medloutauto.com",
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
];

app.use(
  cors({
    // Unknown origins simply get no CORS headers (the browser blocks them)
    // instead of a 500 error.
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Answers even when the database is down (for uptime checks).
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Make sure MongoDB is connected before any route runs (serverless cold starts).
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.use("/api/user", require("./routes/user.routes"));
app.use("/api/product", require("./routes/product.routes"));
app.use("/api/order", require("./routes/order.routes"));
app.use("/api/message", require("./routes/message.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
