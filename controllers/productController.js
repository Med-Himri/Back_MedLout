const { Product } = require("../models/Product");
const User = require("../models/User");
const ProductService = require("../services/product.service");
const { cloudinaryUploadImage } = require("../utils/cloudinary");

/** --------------------------------------------------
 * @desc    Create new product
 * @route   /api/product/addproduct
 * @method  POST
 * @access  Private (staff / admin)
 -------------------------------------------------- **/
exports.createProductCtrl = async (req, res) => {
  const {
    title,
    slug,
    price,
    discountPrice,
    stock,
    category,
    tags,
    shortDescription,
    metaTitle,
    metaDescription,
    description,
  } = req.body;

  const user = req.id;
  const files = req.files;

  try {
    let staff = await User.findById(user);
    if (!staff) {
      return res.status(403).json({ message: "Access denied. Staff or admin only." });
    }

    if (!title || !price || !description || !files?.mainImage) {
      return res.status(400).json({
        message: "title, price, description and main image are required",
      });
    }

    const mainImageUpload = await cloudinaryUploadImage(files.mainImage[0].path);

    let galleryImages = [];
    if (files.gallery && files.gallery.length > 0) {
      for (const img of files.gallery) {
        const uploaded = await cloudinaryUploadImage(img.path);
        galleryImages.push({ url: uploaded.secure_url, publicId: uploaded.public_id });
      }
    }

    const newProduct = await ProductService.createProduct({
      title,
      slug,
      price,
      discountPrice,
      stock,
      category,
      tags,
      shortDescription,
      metaTitle,
      metaDescription,
      description,
      user,
      mainImage: { url: mainImageUpload.secure_url, publicId: mainImageUpload.public_id },
      gallery: galleryImages,
    });

    res.status(201).json({ product: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Error creating product", error });
  }
};

/* ================= GET ALL ACCEPTED PRODUCTS ================= */
exports.getAllProductsCtrl = async (req, res) => {
  try {
    const products = await Product.find({ accepted: true }).sort({ createdAt: -1 }).lean();
    if (!products.length) {
      return res.status(404).json({ message: "No products found" });
    }
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products", error });
  }
};

/* ================= GET SINGLE PRODUCT ================= */
exports.getSingleProductCtrl = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ message: "Product slug is required" });
    }
    const product = await Product.findOne({ slug, accepted: true });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/* ================= GET PRODUCTS (ADMIN LIST) ================= */
exports.getProductsCtrl = async (req, res) => {
  try {
    const products = await Product.find().select("title mainImage accepted").lean();
    if (!products.length) {
      return res.status(404).json({ message: "No products found" });
    }
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= SITEMAP DATA ================= */
exports.getProductSitemapCtrl = async (req, res) => {
  try {
    const products = await Product.find({ accepted: true }).select("slug updatedAt").lean();
    res.status(200).json(products || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= LAST PRODUCTS ================= */
exports.getLastProductsCtrl = async (req, res) => {
  try {
    const products = await Product.find({ accepted: true })
      .select("title mainImage shortDescription price")
      .sort({ _id: -1 })
      .limit(3)
      .lean();
    if (!products.length) {
      return res.status(404).json({ message: "No products found" });
    }
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching last products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ================= REJECT PRODUCT ================= */
exports.rejectProductCtrl = async (req, res) => {
  try {
    const { id } = req.body;
    const deletedProduct = await Product.findOneAndDelete({ _id: id });
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted successfully", deletedProduct });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error });
  }
};

/* ================= ACCEPT PRODUCT ================= */
exports.acceptProductCtrl = async (req, res) => {
  try {
    const { id } = req.body;
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id },
      { accepted: true },
      { new: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product accepted successfully", updatedProduct });
  } catch (error) {
    res.status(500).json({ message: "Error accepting product", error });
  }
};

/* ================= GET PRODUCT BY ID (ADMIN — no accepted filter) ================= */
exports.getProductByIdCtrl = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product by id:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

/* ================= UPDATE PRODUCT (ADMIN / STAFF) ================= */
// @route POST /api/product/updateproduct
exports.updateProductCtrl = async (req, res) => {
  const {
    id,
    title,
    slug,
    price,
    discountPrice,
    stock,
    category,
    tags,
    shortDescription,
    metaTitle,
    metaDescription,
    description,
  } = req.body;

  const user = req.id;
  const files = req.files;

  try {
    const staff = await User.findById(user);
    if (!staff) {
      return res.status(403).json({ message: "Access denied. Staff or admin only." });
    }

    if (!id) {
      return res.status(400).json({ message: "Product id is required" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (files?.mainImage) {
      const uploaded = await cloudinaryUploadImage(files.mainImage[0].path);
      product.mainImage = { url: uploaded.secure_url, publicId: uploaded.public_id };
    }

    if (files?.gallery && files.gallery.length > 0) {
      for (const img of files.gallery) {
        const uploaded = await cloudinaryUploadImage(img.path);
        product.gallery.push({ url: uploaded.secure_url, publicId: uploaded.public_id });
      }
    }

    if (title !== undefined) product.title = title;
    if (slug !== undefined) product.slug = slug;
    if (price !== undefined) product.price = price;
    if (discountPrice !== undefined) product.discountPrice = discountPrice;
    if (stock !== undefined) product.stock = stock;
    if (category !== undefined) product.category = category;
    if (tags !== undefined) {
      product.tags = typeof tags === "string" ? tags.split(",").map((t) => t.trim()).filter(Boolean) : tags;
    }
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (metaTitle !== undefined) product.metaTitle = metaTitle;
    if (metaDescription !== undefined) product.metaDescription = metaDescription;
    if (description !== undefined) product.description = description;

    await product.save();

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Error updating product", error });
  }
};

/* ================= AI-ASSISTED PRODUCT CREATION (vision model) ================= */
exports.createAIProductCtrl = async (req, res) => {
  const {
    productName,
    price,
    discountPrice,
    galleryMeta,
  } = req.body;
  const user = req.id;

  const mainImageFile = req.files && req.files["mainImage"] ? req.files["mainImage"][0] : null;
  const galleryImageFiles = req.files && req.files["galleryImages"] ? req.files["galleryImages"] : [];

  try {
    if (!productName || !price || !mainImageFile) {
      return res.status(400).json({
        error: "Product name, price, and main image are required!",
      });
    }

    const uploadedMainImage = await cloudinaryUploadImage(mainImageFile.path);

    const recentProducts = await Product.find().sort({ createdAt: -1 }).limit(5);
    const internalLinks = recentProducts.map(
      (prod) => `https://www.medloutauto.com/product/${prod.slug}`
    );

    const linksPrompt =
      internalLinks.length > 0
        ? `\n- INTERNAL LINKS: You MUST naturally integrate 1 or 2 of the following links into the product description text to cross-sell other parts:\n  ${internalLinks.join(
            "\n  "
          )}`
        : "";

    const systemPrompt = `
    You are an expert eCommerce copywriter and SEO specialist for "Medlout Auto", a B2C store selling accessories.
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

    const apiKey = process.env.GROQ_API_KEY;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.6-27b",
        reasoning_effort: "none",
        reasoning_format: "hidden",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `The product name provided by the user is: "${productName}". Look at the attached photo and base the category, tags, and description on what it actually shows.`,
              },
              { type: "image_url", image_url: { url: uploadedMainImage.secure_url } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API Error:", data);
      return res.status(response.status).json({
        message: "Error from Groq API",
        error: data.error?.message || "Unknown error",
      });
    }

    const responseText = data.choices[0].message.content;

    let aiData;
    try {
      aiData = JSON.parse(responseText);
    } catch (parseErr) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Could not extract JSON from AI response:", responseText);
        return res.status(500).json({
          message: "AI response was not valid JSON",
          error: parseErr.message,
        });
      }
      aiData = JSON.parse(jsonMatch[0]);
    }

    let parsedGalleryMeta = [];
    if (galleryMeta) {
      try {
        parsedGalleryMeta = JSON.parse(galleryMeta);
      } catch (err) {
        console.error("Error parsing galleryMeta:", err);
      }
    }

    let uploadedGallery = [];
    if (galleryImageFiles.length > 0) {
      const uploadPromises = galleryImageFiles.map((file) => cloudinaryUploadImage(file.path));
      const results = await Promise.all(uploadPromises);
      uploadedGallery = results.map((result, i) => ({
        url: result.secure_url,
        publicId: result.public_id,
        alt: parsedGalleryMeta[i]?.alt || productName,
      }));
    }

    const newProduct = await Product.create({
      title: productName, // title is written by you, not AI-generated
      slug: aiData.slug,
      description: aiData.description,
      shortDescription: aiData.shortDescription,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : undefined,
      category: aiData.category,
      tags: aiData.tags,
      metaTitle: aiData.metaTitle,
      metaDescription: aiData.metaDescription,
      user: user,
      mainImage: { url: uploadedMainImage.secure_url, publicId: uploadedMainImage.public_id },
      gallery: uploadedGallery,
      accepted: false,
    });

    res.status(201).json({
      message: "AI Product generated and saved successfully for Medlout Auto",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error creating AI product:", error);
    res.status(500).json({
      message: "Error creating AI product",
      error: error.message || error,
    });
  }
};