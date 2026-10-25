const os = require("os");
const multer = require("multer");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

// Files land in the OS temp dir (the only writable place on Vercel) and are
// deleted again right after they are sent to Cloudinary (see utils/cloudinary.js).
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    const error = new Error("Seules les images JPEG, PNG, WEBP, AVIF ou GIF sont acceptées.");
    error.status = 400;
    cb(error);
  },
});

module.exports = upload;
