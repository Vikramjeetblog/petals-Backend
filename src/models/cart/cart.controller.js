const mongoose = require('mongoose');
const Cart = require('./cart.model');
const Product = require('../product/product.model');

/* ======================================================
   ADD TO CART (NORMAL + KIT)
====================================================== */
exports.addToCart = async (req, res) => {
  try {
    /* ---------- AUTH GUARD ---------- */
    if (!req.user || !req.user._id) {
      console.log('❌ ADD CART: req.user missing');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = req.user;
    const { productId, quantity = 1 } = req.body;

    console.log('🧪 ADD CART HIT', { userId: user._id, productId, quantity });

    if (!productId) {
      return res.status(400).json({ message: 'Product ID required' });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await Product.findById(productId);
    console.log('🧪 PRODUCT FOUND:', product?.name, product?.fulfillmentModel);

    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not available' });
    }

    let cart = await Cart.findOne({ user: user._id, isActive: true });

    if (!cart) {
      cart = await Cart.create({
        user: user._id,
        assignedStore: user.assignedStore || null
      });
      console.log('🧪 NEW CART CREATED');
    }

    /* ================= KIT ================= */
    if (product.isKit) {
      if (product.fulfillmentModel !== 'EXPRESS') {
        return res.status(400).json({
          message: 'Kits must be EXPRESS products'
        });
      }

      const existingKit = cart.expressItems.find(
        (i) => i.product.toString() === productId
      );

      if (existingKit) existingKit.quantity += quantity;
      else {
        cart.expressItems.push({
          product: product._id,
          quantity,
          price: product.price
        });
      }

      await cart.save();
      return res.status(200).json({ message: 'Kit added to cart', cart });
    }

    /* ================= EXPRESS ================= */
    if (product.fulfillmentModel === 'EXPRESS') {
      if (!user.assignedStore) {
        return res.status(400).json({
          message: 'Please set delivery location first'
        });
      }

      const existingItem = cart.expressItems.find(
        (i) => i.product.toString() === productId
      );

      if (existingItem) existingItem.quantity += quantity;
      else {
        cart.expressItems.push({
          product: product._id,
          quantity,
          price: product.price
        });
      }
    }

    /* ================= MARKETPLACE ================= */
    if (product.fulfillmentModel === 'MARKETPLACE') {
      if (!product.vendor) {
        return res.status(400).json({
          message: 'Marketplace product has no vendor'
        });
      }

      const existingItem = cart.marketplaceItems.find(
        (i) => i.product.toString() === productId
      );

      if (existingItem) existingItem.quantity += quantity;
      else {
        cart.marketplaceItems.push({
          product: product._id,
          vendor: product.vendor,
          quantity,
          price: product.price
        });
      }
    }

    await cart.save();

    console.log('✅ ITEM ADDED TO CART');

    return res.status(200).json({
      message: 'Item added to cart',
      cart
    });
  } catch (error) {
    console.error('❌ ADD TO CART ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/* ======================================================
   VIEW CART
====================================================== */
exports.viewCart = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
      isActive: true
    })
      .populate('expressItems.product')
      .populate('marketplaceItems.product')
      .populate('marketplaceItems.vendor');

    if (!cart) {
      return res.status(200).json({ message: 'Cart is empty', cart: null });
    }

    let expressTotal = 0;
    let marketplaceTotal = 0;

    cart.expressItems.forEach(
      (i) => (expressTotal += i.price * i.quantity)
    );
    cart.marketplaceItems.forEach(
      (i) => (marketplaceTotal += i.price * i.quantity)
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
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({
      user: req.user._id,
      isActive: true
    });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    let found = false;

    cart.expressItems = cart.expressItems.filter((item) => {
      if (item.product.toString() === productId) {
        found = true;
        if (quantity > 0) {
          item.quantity = quantity;
          return true;
        }
        return false;
      }
      return true;
    });

    cart.marketplaceItems = cart.marketplaceItems.filter((item) => {
      if (item.product.toString() === productId) {
        found = true;
        if (quantity > 0) {
          item.quantity = quantity;
          return true;
        }
        return false;
      }
      return true;
    });

    if (!found) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    await cart.save();

    return res.status(200).json({ message: 'Cart updated', cart });
  } catch (error) {
    console.error('❌ UPDATE QTY ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
