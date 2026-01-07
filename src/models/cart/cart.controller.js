const mongoose = require('mongoose');
const Cart = require('./cart.model');
const Product = require('../product/product.model');

/* ======================================================
   ADD TO CART (NORMAL + KIT)
====================================================== */
exports.addToCart = async (req, res) => {
  try {
    const user = req.user;
    const { productId, quantity = 1 } = req.body;

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

    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not available' });
    }

    let cart = await Cart.findOne({ user: user._id, isActive: true });

    if (!cart) {
      cart = await Cart.create({
        user: user._id,
        assignedStore: user.assignedStore || null
      });
    }

    /* ================= KIT ================= */
    if (product.isKit) {
      if (product.fulfillmentModel !== 'EXPRESS') {
        return res.status(400).json({
          message: 'Kits must be EXPRESS products'
        });
      }

      const existingKit = cart.expressItems.find(
        (item) => item.product.toString() === productId
      );

      if (existingKit) {
        existingKit.quantity += quantity;
      } else {
        cart.expressItems.push({
          product: product._id,
          quantity,
          price: product.price
        });
      }

      await cart.save();

      return res.status(200).json({
        message: 'Kit added to cart',
        cart
      });
    }

    /* ================= EXPRESS ================= */
    if (product.fulfillmentModel === 'EXPRESS') {
      if (!user.assignedStore) {
        return res.status(400).json({
          message: 'Please set delivery location first'
        });
      }

      const existingItem = cart.expressItems.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
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
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.marketplaceItems.push({
          product: product._id,
          vendor: product.vendor,
          quantity,
          price: product.price
        });
      }
    }

    await cart.save();

    return res.status(200).json({
      message: 'Item added to cart',
      cart
    });
  } catch (error) {
    console.error('ADD TO CART ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/* ======================================================
   VIEW CART
====================================================== */
exports.viewCart = async (req, res) => {
  try {
    const user = req.user;

    const cart = await Cart.findOne({
      user: user._id,
      isActive: true
    })
      .populate('expressItems.product')
      .populate('marketplaceItems.product')
      .populate('marketplaceItems.vendor');

    if (!cart) {
      return res.status(200).json({
        message: 'Cart is empty',
        cart: null
      });
    }

    let expressTotal = 0;
    let marketplaceTotal = 0;

    cart.expressItems.forEach((item) => {
      expressTotal += item.price * item.quantity;
    });

    cart.marketplaceItems.forEach((item) => {
      marketplaceTotal += item.price * item.quantity;
    });

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
    console.error('VIEW CART ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/* ======================================================
   UPDATE QUANTITY (0 = REMOVE)
====================================================== */
exports.updateQuantity = async (req, res) => {
  try {
    const user = req.user;
    const { productId, quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const cart = await Cart.findOne({
      user: user._id,
      isActive: true
    });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    let itemFound = false;

    cart.expressItems = cart.expressItems.filter((item) => {
      if (item.product.toString() === productId) {
        itemFound = true;
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
        itemFound = true;
        if (quantity > 0) {
          item.quantity = quantity;
          return true;
        }
        return false;
      }
      return true;
    });

    if (!itemFound) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    await cart.save();

    return res.status(200).json({
      message: 'Cart updated',
      cart
    });
  } catch (error) {
    console.error('UPDATE QUANTITY ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/* ======================================================
   REMOVE ITEM
====================================================== */
exports.removeItem = async (req, res) => {
  try {
    const user = req.user;
    const { productId } = req.body;

    const cart = await Cart.findOne({
      user: user._id,
      isActive: true
    });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.expressItems = cart.expressItems.filter(
      (item) => item.product.toString() !== productId
    );

    cart.marketplaceItems = cart.marketplaceItems.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    return res.status(200).json({
      message: 'Item removed from cart',
      cart
    });
  } catch (error) {
    console.error('REMOVE ITEM ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

/* ======================================================
   MERGE CART (GUEST → USER)
====================================================== */
exports.mergeCart = async (req, res) => {
  try {
    const user = req.user;
    const { items = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items to merge' });
    }

    let cart = await Cart.findOne({ user: user._id, isActive: true });

    if (!cart) {
      cart = await Cart.create({
        user: user._id,
        assignedStore: user.assignedStore || null
      });
    }

    for (const entry of items) {
      const { productId, quantity } = entry;

      if (!mongoose.Types.ObjectId.isValid(productId) || quantity < 1) {
        continue;
      }

      const product = await Product.findById(productId);
      if (!product || !product.isActive) continue;

      /* KIT */
      if (product.isKit) {
        const kitItem = cart.expressItems.find(
          (i) => i.product.toString() === productId
        );

        if (kitItem) kitItem.quantity += quantity;
        else {
          cart.expressItems.push({
            product: product._id,
            quantity,
            price: product.price
          });
        }
        continue;
      }

      /* EXPRESS */
      if (product.fulfillmentModel === 'EXPRESS') {
        const item = cart.expressItems.find(
          (i) => i.product.toString() === productId
        );

        if (item) item.quantity += quantity;
        else {
          cart.expressItems.push({
            product: product._id,
            quantity,
            price: product.price
          });
        }
      }

      /* MARKETPLACE */
      if (product.fulfillmentModel === 'MARKETPLACE') {
        const item = cart.marketplaceItems.find(
          (i) => i.product.toString() === productId
        );

        if (item) item.quantity += quantity;
        else {
          cart.marketplaceItems.push({
            product: product._id,
            vendor: product.vendor,
            quantity,
            price: product.price
          });
        }
      }
    }

    await cart.save();

    return res.status(200).json({
      message: 'Cart merged successfully',
      cart
    });
  } catch (error) {
    console.error('MERGE CART ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
