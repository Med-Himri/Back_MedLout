const mongoose = require("mongoose");

// One row per vehicle this part fits — a part can fit multiple
// make/model/year combinations, so this is an array.
const CompatibilitySchema = new mongoose.Schema(
  {
    make: { type: String, required: true, trim: true },       // e.g. "Toyota"
    model: { type: String, required: true, trim: true },      // e.g. "Corolla"
    yearFrom: { type: Number, required: true },                // e.g. 2015
    yearTo: { type: Number, required: true },                  // e.g. 2020 (same as yearFrom if single year)
  },
  { _id: true }
);

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    shortDescription: {
      type: String,
      required: false,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      required: false,
    },
    sku: {
      type: String,
      required: false,
      trim: true,
    },
    partNumber: {
      type: String,
      required: false,
      trim: true,
    },
    condition: {
      type: String,
      enum: ["new", "used", "refurbished"],
      default: "new",
    },
    stock: {
      type: String,
      enum: ["in_stock", "out_of_stock"],
      default: "in_stock",
    },
    // Vehicle fitment — the core difference from a generic product schema
    compatibility: {
      type: [CompatibilitySchema],
      default: [],
    },
    category: {
      type: String,
      required: false,
      trim: true, // e.g. "Brakes", "Filters", "Suspension", "Electrical"
    },
    tags: {
      type: [String],
      default: [],
    },
    brand: {
      type: String,
      required: false,
      trim: true, // the PART's manufacturer brand (e.g. "Bosch"), not Medlout Auto itself
    },
    metaTitle: {
      type: String,
      required: false,
      trim: true,
    },
    metaDescription: {
      type: String,
      required: false,
      trim: true,
    },
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
    },
    mainImage: {
      type: Object,
      default: { url: "", publicId: null },
    },
    gallery: {
      type: [Object],
      default: [],
    },
    accepted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Quick helper: "does this part fit a given make/model/year" — useful for
// a compatibility-checker search feature on the frontend later.
ProductSchema.methods.fitsVehicle = function (make, model, year) {
  return this.compatibility.some(
    (c) =>
      c.make.toLowerCase() === make.toLowerCase() &&
      c.model.toLowerCase() === model.toLowerCase() &&
      year >= c.yearFrom &&
      year <= c.yearTo
  );
};

const Product = mongoose.model("Product", ProductSchema);

module.exports = {
  Product,
};