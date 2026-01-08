const mongoose = require('mongoose');
const Cart = require('./cart.model');
const Product = require('../product/product.model');
const mongoose = require('mongoose');
const Cart = require('./cart.model');
const Product = require('../product/product.model');

/* ======================================================
   ADD TO CART (FIXED)
====================================================== */
exports.addToCart = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { productId, quantity = 1 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    const product = await Product.findById(productId).populate('vendor');

    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not available' });
    }

    /* ---------- CART ---------- */
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        isActive: true,
        expressItems: [],
        marketplaceItems: []
      });
    }

    if (!cart.isActive) {
      cart.isActive = true;
      cart.expressItems = [];
      cart.marketplaceItems = [];
    }

    /* ================= KIT (EXPRESS ONLY) ================= */
    if (product.isKit) {
      if (product.fulfillmentModel !== 'EXPRESS') {
        return res.status(400).json({
          message: 'Kits must be EXPRESS products'
        });
      }

      const item = cart.expressItems.find(
        (i) => i.product.toString() === productId
      );

      if (item) {
        item.quantity += quantity;
      } else {
        cart.expressItems.push({
          product: product._id,
          quantity,
          price: product.price
        });
      }

      await cart.save();

      // 🔥 IMPORTANT FIX: populate before returning
      await cart.populate([
        { path: 'expressItems.product' },
        { path: 'marketplaceItems.product' }
      ]);

      return res.status(200).json({
        message: 'Kit added to cart',
        cart
      });
    }

    /* ================= EXPRESS ================= */
    if (product.fulfillmentModel === 'EXPRESS') {
      const item = cart.expressItems.find(
        (i) => i.product.toString() === productId
      );

      if (item) {
        item.quantity += quantity;
      } else {
        cart.expressItems.push({
          product: product._id,
          quantity,
          price: product.price
        });
      }
    }

    /* ================= MARKETPLACE ================= */
    else if (product.fulfillmentModel === 'MARKETPLACE') {
      if (!product.vendor || product.vendor.isActive === false) {
        return res.status(400).json({
          message: 'Vendor unavailable for this product'
        });
      }

      const item = cart.marketplaceItems.find(
        (i) => i.product.toString() === productId
      );

      if (item) {
        item.quantity += quantity;
      } else {
        cart.marketplaceItems.push({
          product: product._id,
          vendor: product.vendor._id,
          quantity,
          price: product.price
        });
      }
    }

    await cart.save();

    // 🔥 IMPORTANT FIX: populate before returning
    await cart.populate([
      { path: 'expressItems.product' },
      { path: 'marketplaceItems.product' }
    ]);

    return res.status(200).json({
      message: 'Item added to cart',
      cart
    });

  } catch (error) {
    console.error('❌ ADD TO CART ERROR:', error);
    return res.status(500).json({ message: error.message });
  }
};


/* ======================================================
   VIEW CART
====================================================== */
exports.viewCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user._id,
      isActive: true
    })
      .populate('expressItems.product')
      .populate('marketplaceItems.product');

    if (!cart) {
      return res.status(200).json({
        message: 'Cart is empty',
        cart: {
          expressItems: [],
          marketplaceItems: [],
          summary: {
            expressTotal: 0,
            marketplaceTotal: 0,
            grandTotal: 0,
            splitRequired: false
          }
        }
      });
    }

    const expressTotal = cart.expressItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    const marketplaceTotal = cart.marketplaceItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    return res.status(200).json({
      message: 'Cart fetched successfully',
      cart: {
        expressItems: cart.expressItems,
        marketplaceItems: cart.marketplaceItems,
        summary: {
          expressTotal,
          marketplaceTotal,
          grandTotal: expressTotal + marketplaceTotal,
          splitRequired:
            cart.expressItems.length > 0 &&
            cart.marketplaceItems.length > 0
        }
      }
    });
  } catch (error) {
    console.error('❌ VIEW CART ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/* ======================================================
   UPDATE QUANTITY
====================================================== */
exports.updateQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({
      user: req.user._id,
      isActive: true
    });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    let updated = false;

    const updateItem = (items) => {
      const index = items.findIndex(
        (i) => i.product.toString() === productId
      );

      if (index === -1) return items;

      updated = true;

      if (quantity > 0) {
        items[index].quantity = quantity;
      } else {
        items.splice(index, 1);
      }

      return items;
    };

    cart.expressItems = updateItem(cart.expressItems);
    cart.marketplaceItems = updateItem(cart.marketplaceItems);

    if (!updated) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    await cart.save();

    return res.status(200).json({
      message: 'Cart updated successfully',
      cart
    });
  } catch (error) {
    console.error('❌ UPDATE QTY ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
