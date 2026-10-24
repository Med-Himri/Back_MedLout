const fs = require("fs/promises");
const cloudinary = require("cloudinary").v2;

// CLOUDINARY_* are the correct names; the old misspelled COULDINARY_* are
// still read so existing deployments keep working.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.COULDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.COULDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.COULDINARY_API_SECRET,
});

const FOLDER = process.env.CLOUDINARY_FOLDER || "medlout";

/** Uploads one multer file and removes its temp copy. Returns { url, publicId }. */
const uploadImage = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: "image",
      folder: FOLDER,
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Échec de l'envoi de l'image vers Cloudinary");
  } finally {
    fs.unlink(file.path).catch(() => {});
  }
};

/** Uploads several files in parallel. */
const uploadImages = (files = []) => Promise.all(files.map(uploadImage));

/** Deletes temp files of a request that ended before they were uploaded. */
const discardUploads = (files) => {
  const all = Object.values(files || {}).flat();
  return Promise.all(all.map((f) => fs.unlink(f.path).catch(() => {})));
};

/** Best-effort delete: a failure here must never fail the user's action. */
const removeImages = async (publicIds = []) => {
  const ids = publicIds.filter(Boolean);
  if (ids.length === 0) return;
  await Promise.all(
    ids.map(async (id) => {
      try {
        await cloudinary.uploader.destroy(id);
      } catch (error) {
        // the SDK can also throw synchronously (e.g. missing config)
        console.error(`Cloudinary delete failed for ${id}:`, error?.message || error);
      }
    })
  );
};

module.exports = { uploadImage, uploadImages, discardUploads, removeImages };
