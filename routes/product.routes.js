const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

const multer = require("multer");
const {
  getProductSitemapCtrl,
  getLastProductsCtrl,
  getProductsCtrl,
  getAllProductsCtrl,
  getSingleProductCtrl,
  getProductByIdCtrl,
  getProductsByVehicleCtrl,
  rejectProductCtrl,
  acceptProductCtrl,
  createProductCtrl,
  updateProductCtrl,
  createAIProductCtrl,
} = require("../controllers/productController");
const upload = multer({ dest: "/tmp/images/" });

/* ================= PUBLIC ROUTES ================= */
router.get("/", getProductSitemapCtrl);
router.get("/getlastProducts", getLastProductsCtrl);
router.get("/getproducts", getProductsCtrl);
router.get("/getallproducts", getAllProductsCtrl);

// Vehicle compatibility search — e.g. /api/product/fits?make=Toyota&model=Corolla&year=2018
router.get("/fits", getProductsByVehicleCtrl);

router.get("/:slug", getSingleProductCtrl);

/* ================= PROTECTED ROUTES (staff/admin) ================= */
router.use(verifyToken);

// Admin lookup by id — placed here (after public routes) since it's two
// path segments ("/admin/:id"), so it never collides with "/:slug" above.
router.get("/admin/:id", getProductByIdCtrl);

router.post(
  "/addproduct",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  createProductCtrl
);

router.post(
  "/createaiproduct",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "galleryImages", maxCount: 10 }, // matches createAIProductCtrl's expected field name
  ]),
  createAIProductCtrl
);

router.post(
  "/updateproduct",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  updateProductCtrl
);

router.post("/delete", rejectProductCtrl);
router.post("/acceptproduct", acceptProductCtrl);

module.exports = router;