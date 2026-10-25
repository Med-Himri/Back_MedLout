const { Message } = require("../models/Message");

const text = (value, max) => String(value ?? "").trim().slice(0, max);

// @route POST /api/message — public contact form
exports.createMessageCtrl = async (req, res) => {
  const name = text(req.body.name, 100);
  const message = text(req.body.message, 3000);
  if (name.length < 2 || message.length < 2) {
    return res.status(400).json({ message: "Le nom et le message sont requis" });
  }
  await Message.create({
    name,
    message,
    phone: text(req.body.phone, 30),
    cityAddress: text(req.body.cityAddress, 300),
  });
  res.status(201).json({ message: "Message enregistré" });
};

// @route GET /api/message — staff
exports.listMessagesCtrl = async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 }).limit(200).lean();
  res.status(200).json(messages);
};

// @route PATCH /api/message/:id — staff, mark read / unread
exports.updateMessageCtrl = async (req, res) => {
  const msg = await Message.findByIdAndUpdate(
    req.params.id,
    { read: Boolean(req.body.read) },
    { new: true }
  ).lean();
  if (!msg) return res.status(404).json({ message: "Message introuvable" });
  res.status(200).json(msg);
};

// @route DELETE /api/message/:id — staff
exports.deleteMessageCtrl = async (req, res) => {
  const msg = await Message.findByIdAndDelete(req.params.id);
  if (!msg) return res.status(404).json({ message: "Message introuvable" });
  res.status(200).json({ message: "Message supprimé" });
};
