const Cart = require('../cart/cart.model');
const Order = require('./order.model');
const Vendor = require('../vendor/vendor.model');
const crypto = require('crypto');

/* ================= ID GENERATOR ================= */
const generatePrefixedId = (prefix) =>
  `${prefix}_${crypto.randomUUID().split('-')[0].toUpperCase()}`;

/* ================= LOGISTICS ENGINE ================= */
const toLogisticsFlags = (product) => {
  const perishable = Boolean(product?.flags?.perishable);
  const fragile =
    Boolean(product?.flags?.fragile) ||
    product?.logisticsFlag === 'FRAGILE';

  const liveAnimal =
    Boolean(product?.flags?.liveAnimal) ||
    product?.logisticsFlag === 'LIVE_ANIMAL';

  return {
    perishable,
    fragile,
    liveAnimal,
    handleWithCare: fragile || liveAnimal,
    logisticsFlag: liveAnimal
      ? 'LIVE_ANIMAL'
      : fragile
      ? 'FRAGILE'
      : null,
  };
};

/* ======================================================
   PLACE ORDER (SCALABLE SPLIT ARCHITECTURE)
====================================================== */
exports.placeOrder = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const cart = await Cart.findOne({
      user: req.user._id,
      isActive: true,
    })
      .populate('expressItems.product')
      .populate('marketplaceItems.product')
      .populate('marketplaceItems.vendor');

    if (!cart || (cart.expressItems.length === 0 && cart.marketplaceItems.length === 0)) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const paymentGroupId = generatePrefixedId('PG');
    const parentOrderId = generatePrefixedId('PO');
    const createdOrders = [];

    /* ================= EXPRESS ORDER ================= */
    if (cart.expressItems.length > 0) {
      let total = 0;

      const items = cart.expressItems.map((item) => {
        if (!item.product || !item.product.isActive) {
          throw new Error('One or more express products are unavailable');
        }

        const lineTotal = item.price * item.quantity;
        total += lineTotal;

        return {
          product: item.product._id,
          quantity: item.quantity,
          price: item.price,
          logisticsFlags: toLogisticsFlags(item.product),
        };
      });

      const expressOrder = await Order.create({
        orderNumber: generatePrefixedId('ORD_EXP'),
        paymentGroupId,
        parentOrderId,
        trackingId: generatePrefixedId('TRK_EXP'),
        user: req.user._id,
        type: 'EXPRESS',
        fulfillmentSource: 'STORE',
        vendor: null,
        items,
        totalAmount: total,
        paymentStatus: 'PAID',
        status: 'PLACED',
      });

      createdOrders.push(expressOrder);
    }

    /* ================= MARKETPLACE GROUPING ================= */
    const vendorBuckets = {};

    for (const item of cart.marketplaceItems) {
      if (!item.product || !item.product.isActive) {
        return res.status(400).json({
          message: 'One or more marketplace products are unavailable',
        });
      }

      if (!item.vendor) {
        return res.status(400).json({
          message: 'Marketplace item missing vendor',
        });
      }

      if (!item.vendor.isActive || !item.vendor.isOnline) {
        return res.status(400).json({
          message: `Vendor ${item.vendor.storeName} is currently unavailable`,
        });
      }

      const vendorId = item.vendor._id.toString();

      if (!vendorBuckets[vendorId]) {
        vendorBuckets[vendorId] = {
          vendor: item.vendor,
          items: [],
          total: 0,
        };
      }

      const lineTotal = item.price * item.quantity;

      vendorBuckets[vendorId].items.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        logisticsFlags: toLogisticsFlags(item.product),
      });

      vendorBuckets[vendorId].total += lineTotal;
    }

    /* ================= CREATE VENDOR ORDERS ================= */
    for (const vendorId in vendorBuckets) {
      const bucket = vendorBuckets[vendorId];

      const vendorOrder = await Order.create({
        orderNumber: generatePrefixedId('ORD_MKT'),
        paymentGroupId,
        parentOrderId,
        trackingId: generatePrefixedId('TRK_MKT'),
        user: req.user._id,
        vendor: bucket.vendor._id,
        type: 'MARKETPLACE',
        fulfillmentSource: 'VENDOR',
        items: bucket.items,
        totalAmount: bucket.total,
        paymentStatus: 'COD',
        status: 'PENDING_VENDOR_ACCEPTANCE',
      });

      createdOrders.push(vendorOrder);
    }

    /* ================= CLEAR CART ================= */
    cart.expressItems = [];
    cart.marketplaceItems = [];
    cart.isActive = false;
    await cart.save();

    return res.status(201).json({
      message: 'Order(s) placed successfully',
      paymentGroupId,
      parentOrderId,
      orderCount: createdOrders.length,
      orders: createdOrders,
    });

  } catch (error) {
    if (error.message?.includes('unavailable')) {
      return res.status(400).json({ message: error.message });
    }

    console.error('PLACE ORDER ERROR:', error);
    return res.status(500).json({
      message: 'Something went wrong',
    });
  }
};

/* ======================================================
   GET USER ORDERS
====================================================== */
exports.getMyOrders = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name image category');

    return res.status(200).json({
      message: 'Orders fetched successfully',
      orders: orders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        trackingId: order.trackingId,
        parentOrderId: order.parentOrderId,
        paymentGroupId: order.paymentGroupId,
        fulfillmentSource: order.fulfillmentSource,
        type: order.type,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        hasFragileItems: order.items.some(
          (item) => item.logisticsFlags?.fragile
        ),
        hasLiveAnimalItems: order.items.some(
          (item) => item.logisticsFlags?.liveAnimal
        ),
        items: order.items,
      })),
    });

  } catch (error) {
    console.error('GET ORDERS ERROR:', error);
    return res.status(500).json({
      message: 'Something went wrong',
    });
  }
};
