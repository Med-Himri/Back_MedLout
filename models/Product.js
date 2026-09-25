const mongoose = require("mongoose");

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
    stock: {
      type: String,
      enum: ["in_stock", "out_of_stock"],
      default: "in_stock",
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

const Product = mongoose.model("Product", ProductSchema);

module.exports = {
  Product,
};