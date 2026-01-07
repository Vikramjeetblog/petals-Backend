const mongoose = require('mongoose');
const Cart = require('../cart/cart.model');
const Order = require('./order.model');

/* ======================================================
   PLACE ORDER (FROM CART)
====================================================== */
exports.placeOrder = async (req, res) => {
  try {
    /* ---------- AUTH ---------- */
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    /* ---------- FETCH CART ---------- */
    const cart = await Cart.findOne({
      user: req.user._id,
      isActive: true
    })
      .populate('expressItems.product')
      .populate('marketplaceItems.product');

    if (!cart) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    if (
      cart.expressItems.length === 0 &&
      cart.marketplaceItems.length === 0
    ) {
      return res.status(400).json({ message: 'Cart has no items' });
    }

    /* ---------- BUILD ORDER ITEMS ---------- */
    const orderItems = [];

    let expressTotal = 0;
    let marketplaceTotal = 0;

    /* EXPRESS ITEMS */
    for (const item of cart.expressItems) {
      if (!item.product || !item.product.isActive) {
        return res.status(400).json({
          message: 'One or more express products are unavailable'
        });
      }

      const lineTotal = item.price * item.quantity;
      expressTotal += lineTotal;

      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        fulfillmentModel: 'EXPRESS',
        vendor: null
      });
    }

    /* MARKETPLACE ITEMS */
    for (const item of cart.marketplaceItems) {
      if (!item.product || !item.product.isActive) {
        return res.status(400).json({
          message: 'One or more marketplace products are unavailable'
        });
      }

      if (!item.vendor) {
        return res.status(400).json({
          message: 'Marketplace item missing vendor'
        });
      }

      const lineTotal = item.price * item.quantity;
      marketplaceTotal += lineTotal;

      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        fulfillmentModel: 'MARKETPLACE',
        vendor: item.vendor
      });
    }

    const grandTotal = expressTotal + marketplaceTotal;

    /* ---------- CREATE ORDER ---------- */
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totals: {
        expressTotal,
        marketplaceTotal,
        grandTotal
      },
      splitRequired:
        cart.expressItems.length > 0 &&
        cart.marketplaceItems.length > 0,
      status: 'ACCEPTED',        // auto-accept
      paymentStatus: 'PAID'      // mock payment
    });

    /* ---------- CLEAR CART ---------- */
    cart.expressItems = [];
    cart.marketplaceItems = [];
    cart.isActive = false;
    await cart.save();

    /* ---------- RESPONSE ---------- */
    return res.status(201).json({
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    console.error('❌ PLACE ORDER ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


/* ======================================================
   GET USER ORDERS (ORDER HISTORY)
====================================================== */
exports.getMyOrders = async (req, res) => {
  try {
    /* ---------- AUTH ---------- */
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product');

    if (!orders || orders.length === 0) {
      return res.status(200).json({
        message: 'No orders found',
        orders: []
      });
    }

    /* ---------- FORMAT RESPONSE ---------- */
    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      splitRequired: order.splitRequired,
      totals: order.totals,
      items: order.items.map((item) => ({
        product: {
          _id: item.product?._id,
          name: item.product?.name,
          image: item.product?.image,
          category: item.product?.category
        },
        quantity: item.quantity,
        price: item.price,
        fulfillmentModel: item.fulfillmentModel
      }))
    }));

    return res.status(200).json({
      message: 'Orders fetched successfully',
      orders: formattedOrders
    });
  } catch (error) {
    console.error('❌ GET ORDERS ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
