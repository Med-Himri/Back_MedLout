// Load env vars FIRST, before anything that might read process.env at import time
// (e.g. your ./config/config.js probably reads MONGODB_URI when required)
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/config");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://front-med-lout.vercel.app", // <-- fixed: removed trailing slash, this was the bug
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

const PORT = process.env.PORT || 5000;

connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const userRoutes = require("./routes/user.routes");
const productsRouter = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");

app.use("/api/user", userRoutes);
app.use("/api/product", productsRouter);
app.use("/api/order", orderRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;