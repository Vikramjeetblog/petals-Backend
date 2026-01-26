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
   GET PRODUCTS
====================================================== */
exports.getProducts = async (req, res) => {
  try {
    console.log("🔵 GET PRODUCTS API HIT");
    console.log("🔎 QUERY PARAMS:", req.query);

    const query = { isActive: true };

    if (req.query.express === "true") {
      query.fulfillmentModel = "EXPRESS";
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
