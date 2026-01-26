const Product = require("./product.model");

exports.createProduct = async (req, res) => {
  try {
    console.log(" CREATE PRODUCT API HIT");

    const payload = {
      ...req.body,
      vendor: req.user._id,
    };

    const product = await Product.create(payload);

    return res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(" CREATE PRODUCT ERROR:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


exports.getProducts = async (req, res) => {
  try {
    const query = {
      vendor: req.user._id, 
    };

    if (req.query.active === "true") {
      query.isActive = true;
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error(" GET PRODUCTS ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      vendor: req.user._id 
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found or access denied"
      });
    }

    Object.assign(product, req.body);
    await product.save();

    return res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(" UPDATE PRODUCT ERROR:", error.message);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
};



exports.toggleProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      vendor: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    product.isActive = !product.isActive;
    await product.save();

    return res.json({
      success: true,
      isActive: product.isActive
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to toggle product"
    });
  }
};


