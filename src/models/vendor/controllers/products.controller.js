const Product = require('../../product/product.model');

/* ======================================================
   GET VENDOR PRODUCTS
   Used in Products Screen
====================================================== */
exports.getProducts = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const products = await Product.find({
      vendor: vendorId,
    }).select('name category price inStock image');

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('❌ GET PRODUCTS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
};

/* ======================================================
   TOGGLE PRODUCT STOCK (IN / OUT OF STOCK)
====================================================== */
exports.toggleStock = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      vendor: vendorId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.inStock = !product.inStock;
    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Stock status updated',
      data: {
        id: product._id,
        inStock: product.inStock,
      },
    });
  } catch (error) {
    console.error('❌ TOGGLE STOCK ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle stock status',
    });
  }
};

/* ======================================================
   (OPTIONAL — FUTURE)
   CREATE PRODUCT
====================================================== */
exports.createProduct = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { name, category, price, image } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name, category and price are required',
      });
    }

    const product = await Product.create({
      vendor: vendorId,
      name,
      category,
      price,
      image,
      inStock: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Product created',
      data: product,
    });
  } catch (error) {
    console.error('❌ CREATE PRODUCT ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
    });
  }
};

/* ======================================================
   (OPTIONAL — FUTURE)
   DELETE PRODUCT
====================================================== */
exports.deleteProduct = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { id } = req.params;

    const product = await Product.findOneAndDelete({
      _id: id,
      vendor: vendorId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted',
    });
  } catch (error) {
    console.error('❌ DELETE PRODUCT ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
    });
  }
};
