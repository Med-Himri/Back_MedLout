const { Product } = require("../models/Product");

const createProduct = async ({
  title,
  slug,
  price,
  discountPrice,
  partNumber,
  sku,
  stock,
  condition,
  compatibility, // [{ make, model, yearFrom, yearTo }]
  category,
  tags,
  brand,
  shortDescription,
  metaTitle,
  metaDescription,
  description,
  mainImage,
  gallery,
  user,
}) => {
  const product = await Product.create({
    title,
    slug,
    price,
    discountPrice,
    partNumber,
    sku,
    stock,
    condition,
    compatibility,
    category,
    tags,
    brand,
    shortDescription,
    metaTitle,
    metaDescription,
    description,
    mainImage,
    gallery,
    user,
  });

  return product;
};

module.exports = {
  createProduct,
};