const { rateLimit } = require("express-rate-limit");

// Counters live in memory, so on serverless each warm instance counts on its
// own. That still stops scripted brute force and spam from a single IP.
const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
  });

module.exports = {
  loginLimiter: limiter(15, 10, "Trop de tentatives de connexion. Réessayez dans 15 minutes."),
  passwordResetLimiter: limiter(15, 5, "Trop de demandes. Réessayez dans 15 minutes."),
  orderLimiter: limiter(60, 20, "Trop de commandes envoyées. Réessayez plus tard."),
  messageLimiter: limiter(60, 10, "Trop de messages envoyés. Réessayez plus tard."),
};
