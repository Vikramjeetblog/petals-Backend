const mongoose = require('mongoose');
const Cart = require('./cart.model');
const Product = require('../product/product.model');

exports.addToCart = async (req, res) => {
  try {
    const user = req.user;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID required' });
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
        assignedStore: user.assignedStore
      });
      console.log(' NEW CART CREATED');
    }

    if (product.fulfillmentType === 'EXPRESS') {
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

    if (product.fulfillmentType === 'MARKETPLACE') {
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

    console.log(' ITEM ADDED TO CART');

    return res.status(200).json({
      message: 'Item added to cart',
      cart
    });

  } catch (error) {
    console.error('ADD TO CART ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


// view Cart 


exports.viewCart = async (req, res) => {
  try {
    console.log(' VIEW CART API HIT');

    const user = req.user;
    console.log(' USER ID:', user._id.toString());

    const cart = await Cart.findOne({
      user: user._id,
      isActive: true
    })
      .populate('expressItems.product')
      .populate('marketplaceItems.product')
      .populate('marketplaceItems.vendor');

    if (!cart) {
      console.log(' CART NOT FOUND / EMPTY');
      return res.status(200).json({
        message: 'Cart is empty',
        cart: null
      });
    }

    console.log(' CART FOUND');
    console.log(' EXPRESS ITEMS COUNT:', cart.expressItems.length);
    console.log(' MARKETPLACE ITEMS COUNT:', cart.marketplaceItems.length);

    // Calculate totals
    let expressTotal = 0;
    let marketplaceTotal = 0;

    cart.expressItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      expressTotal += itemTotal;

      console.log(' EXPRESS ITEM:', {
        product: item.product?.name,
        qty: item.quantity,
        price: item.price,
        total: itemTotal
      });
    });

    cart.marketplaceItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      marketplaceTotal += itemTotal;

      console.log(' MARKETPLACE ITEM:', {
        product: item.product?.name,
        vendor: item.vendor?.toString(),
        qty: item.quantity,
        price: item.price,
        total: itemTotal
      });
    });

    const grandTotal = expressTotal + marketplaceTotal;

    console.log(' CART TOTALS:', {
      expressTotal,
      marketplaceTotal,
      grandTotal
    });

    return res.status(200).json({
      message: 'Cart fetched successfully',
      cart: {
        expressItems: cart.expressItems,
        marketplaceItems: cart.marketplaceItems,
        summary: {
          expressTotal,
          marketplaceTotal,
          grandTotal,
          splitRequired:
            cart.expressItems.length > 0 &&
            cart.marketplaceItems.length > 0
        }
      }
    });

  } catch (error) {
    console.error(' VIEW CART ERROR:', error);
    return res.status(500).json({
      message: 'Something went wrong'
    });
  }
};

//update Cart Quantity


exports.updateQuantity = async (req, res) => {
  try {
    console.log('🛒 UPDATE QUANTITY API HIT');

    const user = req.user;
    const { productId, quantity } = req.body;

    console.log('📦 INPUT:', { productId, quantity });

    const cart = await Cart.findOne({
      user: user._id,
      isActive: true
    });

    if (!cart) {
      console.log('❌ CART NOT FOUND');
      return res.status(404).json({ message: 'Cart not found' });
    }

    console.log('✅ CART FOUND');

    let itemFound = false;

    // EXPRESS
    cart.expressItems.forEach((item) => {
      if (item.product.toString() === productId) {
        itemFound = true;
        item.quantity = quantity;
        console.log('⚡ EXPRESS ITEM UPDATED');
      }
    });

    // MARKETPLACE
    cart.marketplaceItems.forEach((item) => {
      if (item.product.toString() === productId) {
        itemFound = true;
        item.quantity = quantity;
        console.log('🏪 MARKETPLACE ITEM UPDATED');
      }
    });

    if (!itemFound) {
      console.log('❌ ITEM NOT FOUND IN CART');
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    await cart.save();
    console.log('💾 CART SAVED');

    return res.status(200).json({
      message: 'Quantity updated',
      cart
    });

  } catch (error) {
    console.error('❌ UPDATE QUANTITY ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


