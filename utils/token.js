const jwt = require("jsonwebtoken");

// JWT_SECRET is the new name; JWT_SECRTKEY is still read so existing
// deployments keep working without touching their environment.
const jwtSecret = () => {
  const secret = process.env.JWT_SECRET || process.env.JWT_SECRTKEY;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
};

const generateToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, jwtSecret(), {
    algorithm: "HS256",
    expiresIn: "24h",
  });

module.exports = { generateToken, jwtSecret };
