const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const upload = require("../middlewares/upload");
const { verifyToken } = require("../middlewares/authMiddleware");
const {
  getProductSitemapCtrl,
  getLastProductsCtrl,
  getProductsCtrl,
  getAllProductsCtrl,
  getSingleProductCtrl,
  getProductByIdCtrl,
  rejectProductCtrl,
  acceptProductCtrl,
  createProductCtrl,
  updateProductCtrl,
  createAIProductCtrl,
} = require("../controllers/productController");

const router = express.Router();

const productImages = upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "gallery", maxCount: 10 },
]);

// Auth is applied per route (not router.use) so the order of routes can't
// accidentally make a protected route public or vice versa.

/* ================= PUBLIC ================= */
router.get("/", asyncHandler(getProductSitemapCtrl));
router.get("/getlastProducts", asyncHandler(getLastProductsCtrl));
router.get("/getallproducts", asyncHandler(getAllProductsCtrl));

/* ================= STAFF / ADMIN ================= */
// Declared before "/:slug" so "getproducts" is not read as a slug
router.get("/getproducts", verifyToken, asyncHandler(getProductsCtrl));
router.get("/admin/:id", verifyToken, asyncHandler(getProductByIdCtrl));

router.post("/addproduct", verifyToken, productImages, asyncHandler(createProductCtrl));
router.post("/updateproduct", verifyToken, productImages, asyncHandler(updateProductCtrl));
router.post(
  "/createaiproduct",
  verifyToken,
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 10 },
  ]),
  asyncHandler(createAIProductCtrl)
);
router.post("/acceptproduct", verifyToken, asyncHandler(acceptProductCtrl));
router.post("/delete", verifyToken, asyncHandler(rejectProductCtrl));

/* ================= PUBLIC (catch-all, keep last) ================= */
router.get("/:slug", asyncHandler(getSingleProductCtrl));

module.exports = router;
