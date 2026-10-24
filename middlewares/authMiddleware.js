const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtSecret } = require("../utils/token");

// The owner account (ADMIN_EMAIL) is always an admin, even if its `isadmin`
// flag was never set in the database — that's how the first admin gets in.
const isAdminUser = (user) => {
  const ownerEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  return Boolean(user.isadmin) || (ownerEmail !== "" && user.email.toLowerCase() === ownerEmail);
};

/**
 * Checks the Bearer token and loads the signed-in staff member into req.user.
 * Every error path responds with a 401 — never `throw` here: Express 4 does
 * not catch errors thrown from async middleware, and the whole server crashes.
 */
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ message: "Non autorisé : veuillez vous connecter." });
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret(), { algorithms: ["HS256"] });
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Session expirée, veuillez vous reconnecter."
        : "Token invalide.";
    return res.status(401).json({ message });
  }

  try {
    const user = await User.findById(payload.id).select("-password").lean();
    if (!user) {
      return res.status(401).json({ message: "Compte introuvable." });
    }
    req.id = String(user._id);
    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: isAdminUser(user) ? "admin" : "staff",
    };
    next();
  } catch (error) {
    next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Réservé aux administrateurs." });
  }
  next();
};

module.exports = { verifyToken, requireAdmin, isAdminUser };
