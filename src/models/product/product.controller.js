const Product = require("./product.model");

/* ======================================================
   CREATE PRODUCT
====================================================== */
exports.createProduct = async (req, res) => {
  try {
    console.log(" CREATE PRODUCT API HIT");
    console.log(" REQUEST BODY:", JSON.stringify(req.body, null, 2));

    const product = await Product.create(req.body);

    console.log(" PRODUCT CREATED:", product._id.toString());

    return res.status(201).json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error("❌ CREATE PRODUCT ERROR:");
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
      stack: error.stack // dev only
    });
  }
};
/* ======================================================
   Search Product
====================================================== */

exports.searchProducts = async (req, res) => {
  try {
    const { q, category, isKit, fulfillmentModel } = req.query;

    const filter = {
      isActive: true,
    };

    /* 🔍 TEXT SEARCH (name + category) */
    if (q && q.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { category: { $regex: q.trim(), $options: 'i' } },
      ];
    }

    /* 📂 CATEGORY FILTER */
    if (category) {
      filter.category = category;
    }

    /* 🎁 KIT FILTER */
    if (isKit !== undefined) {
      filter.isKit = isKit === 'true';
    }

    /* ⚡ DELIVERY TYPE */
    if (fulfillmentModel) {
      filter.fulfillmentModel = fulfillmentModel;
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('❌ SEARCH PRODUCTS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search products',
    });
  }
};



/* ======================================================
   GET PRODUCTS
====================================================== */
exports.getProducts = async (req, res) => {
  try {
    console.log("🔵 GET PRODUCTS API HIT");
    console.log("🔎 QUERY PARAMS:", req.query);

    const query = { isActive: true };

    /* ================= EXPRESS FILTER ================= */
    if (req.query.express === "true") {
      query.fulfillmentModel = "EXPRESS";
    }

    /* ================= KIT FILTER (🔥 MAIN FIX) ================= */
    if (req.query.isKit === "true") {
      query.isKit = true;
    }

    if (req.query.isKit === "false") {
      query.isKit = false;
    }

    /* ================= CATEGORY FILTER ================= */
    if (req.query.category) {
      query.category = req.query.category;
    }

    const products = await Product.find(query);

    console.log(`✅ PRODUCTS FOUND: ${products.length}`);

    return res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error("❌ GET PRODUCTS ERROR:");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



/* ======================================================
   GET PRODUCT BY ID (FOR KIT DETAIL)
====================================================== */
exports.getProductById = async (req, res) => {
  try {
    console.log("🔵 GET PRODUCT BY ID API HIT");
    console.log("🆔 PRODUCT ID:", req.params.id);

    const product = await Product.findById(req.params.id)
      .populate("kitData.items.productId");

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error("❌ GET PRODUCT BY ID ERROR:");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/* ======================================================
   UPDATE PRODUCT
====================================================== */
exports.updateProduct = async (req, res) => {
  try {
    console.log("🔵 UPDATE PRODUCT API HIT");
    console.log("🆔 PRODUCT ID:", req.params.id);
    console.log("📦 UPDATE BODY:", JSON.stringify(req.body, null, 2));

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      console.log("❌ PRODUCT NOT FOUND");
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    console.log("✅ PRODUCT UPDATED:", updatedProduct._id.toString());

    return res.json({
      success: true,
      data: updatedProduct
    });

  } catch (error) {
    console.error("❌ UPDATE PRODUCT ERROR:");
    console.error(error);

    return res.status(400).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
};




