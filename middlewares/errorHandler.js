const multer = require("multer");

const notFound = (req, res) => {
  res.status(404).json({ message: "Route introuvable" });
};

// Central error handler: logs the details, sends the client a clean message.
// Internal error objects are never sent back.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image trop lourde (8 Mo maximum)."
        : "Fichier refusé : " + err.message;
    return res.status(400).json({ message });
  }
  if (err.status === 400 || err.statusCode === 400) {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Identifiant invalide." });
  }
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(" ");
    return res.status(400).json({ message });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "valeur";
    return res.status(409).json({ message: `Cette ${field} existe déjà.` });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Requête trop volumineuse." });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ message: "Erreur interne du serveur." });
};

module.exports = { notFound, errorHandler };
