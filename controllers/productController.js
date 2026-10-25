const sanitizeHtml = require("sanitize-html");
const { Product } = require("../models/Product");
const { uploadImage, uploadImages, discardUploads, removeImages } = require("../utils/cloudinary");

const SITE_URL = (process.env.SITE_URL || "https://www.medloutauto.com").replace(/\/$/, "");
const STOCK_VALUES = ["in_stock", "out_of_stock"];

// Fields the public shop grid / cards need — never the full HTML description.
const CARD_FIELDS = "title slug price discountPrice stock category mainImage shortDescription createdAt";

/* ================= HELPERS ================= */

// The description is rendered as HTML on the product page, so only harmless
// formatting tags survive (no <script>, no on* attributes, no javascript: links).
const cleanDescription = (html = "") =>
  sanitizeHtml(String(html), {
    allowedTags: [
      "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s",
      "ul", "ol", "li", "a", "blockquote", "span",
    ],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });

const slugify = (str = "") =>
  String(str)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Returns `base`, or `base-2`, `base-3`... — whichever is not used by another product. */
const uniqueSlug = async (wanted, excludeId) => {
  const base = slugify(wanted) || "produit";
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!clash) return slug;
    slug = `${base}-${i}`;
  }
};

// Accepts an array or a "a, b, c" string (multipart forms send strings).
const parseTags = (tags) => {
  const list = Array.isArray(tags) ? tags : String(tags ?? "").split(",");
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))].slice(0, 20);
};

// "" / undefined → undefined (field cleared), otherwise a positive number or NaN.
const parsePrice = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return Number(value);
};

const parseBool = (value) => value === true || value === "true" || value === "1" || value === "on";

const badRequest = (res, message) => res.status(400).json({ message });

/* ================= PUBLIC: ALL ACCEPTED PRODUCTS ================= */
exports.getAllProductsCtrl = async (req, res) => {
  const filter = { accepted: true };
  if (typeof req.query.category === "string" && req.query.category) {
    filter.category = req.query.category;
  }
  const products = await Product.find(filter).select(CARD_FIELDS).sort({ createdAt: -1 }).lean();
  res.status(200).json(products);
};

/* ================= PUBLIC: SINGLE PRODUCT ================= */
exports.getSingleProductCtrl = async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, accepted: true })
    .select("-user")
    .lean();
  if (!product) return res.status(404).json({ message: "Product not found" });
  // Also cleaned on read: products saved before sanitizing existed may hold raw HTML
  product.description = cleanDescription(product.description);
  res.status(200).json(product);
};

/* ================= PUBLIC: SITEMAP DATA ================= */
exports.getProductSitemapCtrl = async (req, res) => {
  const products = await Product.find({ accepted: true }).select("slug updatedAt").lean();
  res.status(200).json(products);
};

/* ================= PUBLIC: LAST PRODUCTS ================= */
exports.getLastProductsCtrl = async (req, res) => {
  const products = await Product.find({ accepted: true })
    .select(CARD_FIELDS)
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();
  res.status(200).json(products);
};

/* ================= ADMIN: LIST (all, including hidden) ================= */
exports.getProductsCtrl = async (req, res) => {
  const products = await Product.find()
    .select("title slug mainImage accepted aiGenerated price discountPrice stock category createdAt")
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json(products);
};

/* ================= ADMIN: BY ID (no accepted filter) ================= */
exports.getProductByIdCtrl = async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.status(200).json(product);
};

/* ================= ADMIN: CREATE (manual form) ================= */
exports.createProductCtrl = async (req, res) => {
  const b = req.body;
  const files = req.files || {};
  const price = parsePrice(b.price);
  const discountPrice = parsePrice(b.discountPrice);

  if (!b.title || !b.description || !files.mainImage) {
    await discardUploads(files);
    return badRequest(res, "Titre, prix, description et image principale sont requis");
  }
  if (!(price > 0) || (discountPrice !== undefined && !(discountPrice >= 0))) {
    await discardUploads(files);
    return badRequest(res, "Prix invalide");
  }

  const [mainImage, gallery] = await Promise.all([
    uploadImage(files.mainImage[0]),
    uploadImages(files.gallery),
  ]);

  const product = await Product.create({
    title: b.title,
    slug: await uniqueSlug(b.slug || b.title),
    price,
    discountPrice,
    stock: STOCK_VALUES.includes(b.stock) ? b.stock : "in_stock",
    category: b.category,
    tags: parseTags(b.tags),
    shortDescription: b.shortDescription,
    metaTitle: b.metaTitle,
    metaDescription: b.metaDescription,
    description: cleanDescription(b.description),
    user: req.id,
    mainImage,
    gallery,
    accepted: b.accepted === undefined ? true : parseBool(b.accepted),
  });

  res.status(201).json({ product });
};

/* ================= ADMIN: UPDATE ================= */
// @route POST /api/product/updateproduct  (multipart; only sent fields change)
exports.updateProductCtrl = async (req, res) => {
  const b = req.body;
  const files = req.files || {};

  const product = b.id ? await Product.findById(b.id) : null;
  if (!product) {
    await discardUploads(files);
    return res.status(404).json({ message: "Product not found" });
  }

  const price = parsePrice(b.price);
  const discountPrice = parsePrice(b.discountPrice);
  if (b.price !== undefined && !(price > 0)) {
    await discardUploads(files);
    return badRequest(res, "Prix invalide");
  }
  if (discountPrice !== undefined && !(discountPrice >= 0)) {
    await discardUploads(files);
    return badRequest(res, "Prix promo invalide");
  }

  const toDelete = [];

  if (files.mainImage) {
    toDelete.push(product.mainImage?.publicId);
    product.mainImage = await uploadImage(files.mainImage[0]);
  }

  // Gallery photos removed in the edit form
  if (b.removeGallery) {
    let ids = [];
    try {
      ids = JSON.parse(b.removeGallery);
    } catch {
      ids = [];
    }
    if (Array.isArray(ids) && ids.length) {
      toDelete.push(...ids);
      product.gallery = product.gallery.filter((img) => !ids.includes(img.publicId));
    }
  }
  if (files.gallery?.length) {
    product.gallery.push(...(await uploadImages(files.gallery)));
  }

  if (b.title !== undefined) product.title = b.title;
  if (b.slug !== undefined && slugify(b.slug) !== product.slug) {
    product.slug = await uniqueSlug(b.slug || product.title, product._id);
  }
  if (price !== undefined) product.price = price;
  if (b.discountPrice !== undefined) product.discountPrice = discountPrice;
  if (STOCK_VALUES.includes(b.stock)) product.stock = b.stock;
  if (b.category !== undefined) product.category = b.category;
  if (b.tags !== undefined) product.tags = parseTags(b.tags);
  if (b.shortDescription !== undefined) product.shortDescription = b.shortDescription;
  if (b.metaTitle !== undefined) product.metaTitle = b.metaTitle;
  if (b.metaDescription !== undefined) product.metaDescription = b.metaDescription;
  if (b.description !== undefined) product.description = cleanDescription(b.description);
  if (b.accepted !== undefined) {
    product.accepted = parseBool(b.accepted);
    // Publishing an AI draft means someone reviewed it
    if (product.accepted) product.aiGenerated = false;
  }

  await product.save();
  removeImages(toDelete); // after the save, so a failed save never loses images

  res.status(200).json({ message: "Product updated successfully", product });
};

/* ================= ADMIN: PUBLISH ================= */
exports.acceptProductCtrl = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.body.id,
    { accepted: true, aiGenerated: false },
    { new: true }
  );
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.status(200).json({ message: "Product accepted successfully", updatedProduct: product });
};

/* ================= ADMIN: DELETE ================= */
exports.rejectProductCtrl = async (req, res) => {
  const product = await Product.findByIdAndDelete(req.body.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  await removeImages([product.mainImage?.publicId, ...product.gallery.map((g) => g.publicId)]);
  res.status(200).json({ message: "Product deleted successfully" });
};

/* ================= ADMIN: AI-ASSISTED CREATION (vision model) ================= */
exports.createAIProductCtrl = async (req, res) => {
  const { productName, galleryMeta } = req.body;
  const price = parsePrice(req.body.price);
  const discountPrice = parsePrice(req.body.discountPrice);
  const files = req.files || {};
  const mainImageFile = files.mainImage?.[0];
  const galleryImageFiles = files.galleryImages || [];

  if (!productName || !mainImageFile || !(price > 0)) {
    await discardUploads(files);
    return badRequest(res, "Nom du produit, prix et image principale sont requis");
  }

  const uploadedMainImage = await uploadImage(mainImageFile);

  const recentProducts = await Product.find({ accepted: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("slug")
    .lean();
  const internalLinks = recentProducts.map((prod) => `${SITE_URL}/produit/${prod.slug}`);

  const linksPrompt =
    internalLinks.length > 0
      ? `\n- INTERNAL LINKS: You MUST naturally integrate 1 or 2 of the following links into the product description text to cross-sell other parts:\n  ${internalLinks.join(
          "\n  "
        )}`
      : "";

  const systemPrompt = `
    You are an expert eCommerce copywriter and SEO specialist for "Medlout Auto", a B2C store selling car accessories in Morocco.
    You will be shown a product photo. Base your category, tags, and description on what the image ACTUALLY shows.

    CATEGORY & VISUAL ANALYSIS REQUIREMENTS:
    - Look at the image carefully before deciding on a category. Respond in FRENCH.
    - ALL generated text (description, shortDescription, metaTitle, metaDescription, category, tags) MUST be written in French, not English.
    - Identify the specific product type as precisely as possible.

    CONTENT & SEO REQUIREMENTS:
    - Slug Quality: base the slug on a clean, corrected version of the product name.
    - Focus Keyword Integration: naturally include relevant LSI keywords for the product type (quality, style, durability).
    - Tone & Audience: write for shoppers who want a clearly-described, quality accessory. Avoid vague marketing fluff — be specific where possible.
    - Accuracy: do NOT claim a specific manufacturer/brand origin unless visually obvious from branding/packaging in the photo.
    - HTML Description: Write a clear, informative product description in valid HTML.
      * Start with a paragraph (<p>) describing what the product is and its use.
      * Use <h2> for sections like "Points Forts", "Caractéristiques".
      * Use <ul>/<li> for feature lists.
      * Use <strong> to highlight quality points.
    - Short Description: 1-2 sentence summary shown under the price, focused on the product's use and quality.
    - Brand Voice: reliable, clear, straightforward.
    ${linksPrompt}

    You MUST return ONLY a valid JSON object. Ensure all HTML inside "description" is properly string-escaped. Use this strict structure:
    {
      "slug": "url-friendly-slug-for-the-title",
      "description": "The full HTML formatted product description here",
      "shortDescription": "Catchy 1-2 sentence short description (max 150 chars)",
      "metaTitle": "SEO optimized meta title (max 60 chars)",
      "metaDescription": "SEO optimized meta description (max 160 chars)",
      "category": "The single most accurate category based on what the IMAGE actually shows",
      "tags": ["tag1", "tag2", "tag3", "tag4"]
    }
  `;

  // Groq periodically renames/retires vision model IDs. Try the current name
  // first, and fall back if Groq reports the model as missing.
  const VISION_MODEL_CANDIDATES = ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b"];

  let response, data;
  for (const model of VISION_MODEL_CANDIDATES) {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        reasoning_effort: "none",
        reasoning_format: "hidden",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `The product name provided by the user is: ${JSON.stringify(
                  String(productName)
                )}. Look at the attached photo and base the category, tags, and description on what it actually shows.`,
              },
              { type: "image_url", image_url: { url: uploadedMainImage.url } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    data = await response.json().catch(() => ({}));

    const modelMissing =
      !response.ok && /does not exist|not found|decommissioned/i.test(data.error?.message || "");
    if (!modelMissing) break; // success, or a different kind of error — stop retrying

    console.warn(`Groq model "${model}" unavailable, trying next candidate...`);
  }

  if (!response.ok) {
    console.error("Groq API Error:", data);
    await discardUploads(files);
    removeImages([uploadedMainImage.publicId]);
    return res.status(502).json({ message: "Le service IA a renvoyé une erreur. Réessayez." });
  }

  const responseText = data.choices?.[0]?.message?.content || "";
  let aiData;
  try {
    aiData = JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    try {
      aiData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      aiData = null;
    }
  }
  if (!aiData || !aiData.description) {
    console.error("Could not extract JSON from AI response:", responseText);
    await discardUploads(files);
    removeImages([uploadedMainImage.publicId]);
    return res.status(502).json({ message: "La réponse de l'IA était invalide. Réessayez." });
  }

  let parsedGalleryMeta = [];
  try {
    parsedGalleryMeta = galleryMeta ? JSON.parse(galleryMeta) : [];
  } catch {
    parsedGalleryMeta = [];
  }

  const gallery = (await uploadImages(galleryImageFiles)).map((img, i) => ({
    ...img,
    alt: parsedGalleryMeta[i]?.alt || productName,
  }));

  const product = await Product.create({
    title: productName, // title is written by you, not AI-generated
    slug: await uniqueSlug(aiData.slug || productName),
    description: cleanDescription(aiData.description),
    shortDescription: aiData.shortDescription,
    price,
    discountPrice,
    category: aiData.category,
    tags: parseTags(aiData.tags),
    metaTitle: aiData.metaTitle,
    metaDescription: aiData.metaDescription,
    user: req.id,
    mainImage: uploadedMainImage,
    gallery,
    accepted: false, // hidden until someone reviews it
    aiGenerated: true,
  });

  res.status(201).json({
    message: "AI Product generated and saved successfully for Medlout Auto",
    product,
  });
};
