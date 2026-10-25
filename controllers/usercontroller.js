const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");
const Otp = require("../models/otp");
const { isAdminUser } = require("../middlewares/authMiddleware");
const { sendPasswordResetEmail, isMailConfigured } = require("../utils/mail");
const { generateToken } = require("../utils/token");

const MIN_PASSWORD = 8;
const MAX_RESET_ATTEMPTS = 5;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const publicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: isAdminUser(user) ? "admin" : "staff",
  createdAt: user.createdAt,
});

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");
  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }

  const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });
  const ok = user && (await bcrypt.compare(password, user.password));
  if (!ok) {
    return res.status(400).json({ message: "Email ou mot de passe incorrect." });
  }

  const me = publicUser(user);
  res.status(200).json({
    message: "Connexion réussie.",
    token: generateToken(user),
    username: me.name,
    adminId: me.id,
    user: me,
  });
};

/* ================= CURRENT USER ================= */
exports.me = async (req, res) => {
  res.status(200).json({ user: req.user });
};

/* ================= CHANGE MY PASSWORD ================= */
exports.changeMyPassword = async (req, res) => {
  const current = String(req.body.current || "");
  const next = String(req.body.next || "");
  if (next.length < MIN_PASSWORD) {
    return res
      .status(400)
      .json({ message: `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.` });
  }

  const user = await User.findById(req.id);
  if (!user || !(await bcrypt.compare(current, user.password))) {
    return res.status(400).json({ message: "Mot de passe actuel incorrect." });
  }

  user.password = await bcrypt.hash(next, 10);
  await user.save();
  res.status(200).json({ message: "Mot de passe modifié." });
};

/* ================= FORGOT PASSWORD ================= */
// Always answers the same way so nobody can find out which emails have an account.
exports.forgotPassword = async (req, res) => {
  const email = String(req.body.email || "").trim();
  if (!email) {
    return res.status(400).json({ message: "Email requis." });
  }

  if (!isMailConfigured()) {
    return res.status(200).json({
      emailDisabled: true,
      message:
        "La récupération par email n'est pas activée. Demandez à un administrateur de vous donner un nouveau mot de passe (page Équipe).",
    });
  }

  const genericReply = {
    message: "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.",
  };

  const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });
  if (!user) return res.status(200).json(genericReply);

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await Otp.deleteMany({ userId: String(user._id) });
  await Otp.create({ userId: String(user._id), token: await bcrypt.hash(code, 10) });

  const frontend = (process.env.FRONTEND_URL || "https://front-med-lout.vercel.app").replace(/\/$/, "");
  const link = `${frontend}/dashboard/reinitialiser?uid=${user._id}&code=${code}`;

  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, link, code });
  } catch (error) {
    console.error("Password reset email failed:", error);
  }

  res.status(200).json(genericReply);
};

/* ================= RESET PASSWORD (with emailed code) ================= */
exports.resetPassword = async (req, res) => {
  const userId = String(req.body.userId || "");
  const code = String(req.body.code || "");
  const newPassword = String(req.body.newPassword || "");

  if (!mongoose.isValidObjectId(userId) || !code) {
    return res.status(400).json({ message: "Lien invalide. Refaites une demande." });
  }
  if (newPassword.length < MIN_PASSWORD) {
    return res
      .status(400)
      .json({ message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.` });
  }

  const record = await Otp.findOne({ userId });
  if (!record || record.attempts >= MAX_RESET_ATTEMPTS) {
    return res.status(400).json({ message: "Lien expiré ou invalide. Refaites une demande." });
  }

  if (!(await bcrypt.compare(code, record.token))) {
    record.attempts += 1;
    await record.save();
    return res.status(400).json({ message: "Code incorrect." });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(400).json({ message: "Lien expiré ou invalide. Refaites une demande." });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  await Otp.deleteMany({ userId });

  res.status(200).json({ message: "Mot de passe modifié. Vous pouvez vous connecter." });
};

/* ================= STAFF (admin only) ================= */
exports.listStaff = async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: 1 }).lean();
  res.status(200).json(users.map(publicUser));
};

exports.createStaff = async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const password = String(req.body.password || "");
  const role = req.body.role === "admin" ? "admin" : "staff";

  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Nom et email valides requis." });
  }
  if (password.length < MIN_PASSWORD) {
    return res
      .status(400)
      .json({ message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.` });
  }

  const exists = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });
  if (exists) {
    return res.status(409).json({ message: "Cet email est déjà utilisé." });
  }

  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    isadmin: role === "admin",
  });
  res.status(201).json(publicUser(user));
};

exports.updateStaffRole = async (req, res) => {
  const { id } = req.params;
  if (id === req.id) {
    return res.status(400).json({ message: "Vous ne pouvez pas changer votre propre rôle." });
  }
  const user = await User.findByIdAndUpdate(
    id,
    { isadmin: req.body.role === "admin" },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "Compte introuvable." });
  res.status(200).json(publicUser(user));
};

// Admin sets a new password for a staff member (no email needed)
exports.setStaffPassword = async (req, res) => {
  const password = String(req.body.password || "");
  if (password.length < MIN_PASSWORD) {
    return res
      .status(400)
      .json({ message: `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.` });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Compte introuvable." });
  user.password = await bcrypt.hash(password, 10);
  await user.save();
  await Otp.deleteMany({ userId: String(user._id) });
  res.status(200).json({ message: `Nouveau mot de passe enregistré pour ${user.name}.` });
};

exports.deleteStaff = async (req, res) => {
  const { id } = req.params;
  if (id === req.id) {
    return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });
  }
  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: "Compte introuvable." });
  await Otp.deleteMany({ userId: id });
  res.status(200).json({ message: "Compte supprimé." });
};
