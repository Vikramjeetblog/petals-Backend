const Cart = require('../cart/cart.model');
const Order = require('../order/order.model');
const Vendor = require('../vendor/vendor.model');
const crypto = require('crypto');
const { VENDOR_ACCEPT_MINUTES } = require('../../config/sla.config');

/* ======================================================
   MULTI-VENDOR CHECKOUT (PRODUCTION READY)
====================================================== */
exports.checkout = async (req, res) => {
  try {
    console.log('🛒 MULTI-VENDOR CHECKOUT HIT');

    const user = req.user;

    /* ================= FIND CART ================= */
    const cart = await Cart.findOne({
      user: user._id,
      isActive: true,
    }).populate('marketplaceItems.vendor');

    if (!cart) {
      return res.status(400).json({
        message: 'Cart is empty',
      });
    }

    if (
      cart.expressItems.length === 0 &&
      cart.marketplaceItems.length === 0
    ) {
      return res.status(400).json({
        message: 'Cart has no items',
      });
    }

    /* ================= PAYMENT GROUP ================= */
    const paymentGroupId = `PG_${crypto.randomUUID()}`;
    const orders = [];

    /* ======================================================
       EXPRESS ORDER (SINGLE)
    ====================================================== */
    if (cart.expressItems.length > 0) {
      let total = 0;

      const items = cart.expressItems.map((i) => {
        const lineTotal = i.price * i.quantity;
        total += lineTotal;

        return {
          product: i.product,
          quantity: i.quantity,
          price: i.price,
        };
      });

      const expressOrder = await Order.create({
        orderNumber: `ORD_EXP_${Date.now()}`,
        user: user._id,
        type: 'EXPRESS',
        vendor: null,
        items,
        totalAmount: total,
        paymentStatus: 'PAID',
        paymentGroupId,
        status: 'PLACED',
      });

      console.log('⚡ EXPRESS ORDER CREATED:', expressOrder._id);
      orders.push(expressOrder);
    }

    /* ======================================================
       GROUP MARKETPLACE ITEMS BY VENDOR
    ====================================================== */
    const vendorBuckets = {};

    for (const item of cart.marketplaceItems) {
      if (!item.vendor) {
        return res.status(400).json({
          message: 'Marketplace item missing vendor',
        });
      }

      const vendorId = item.vendor._id.toString();

      // Validate vendor status
      if (!item.vendor.isActive || !item.vendor.isOnline) {
        return res.status(400).json({
          message: `Vendor ${item.vendor.storeName} is currently unavailable`,
        });
      }

      if (!vendorBuckets[vendorId]) {
        vendorBuckets[vendorId] = {
          vendor: item.vendor._id,
          vendorData: item.vendor,
          items: [],
          total: 0,
        };
      }

      const lineTotal = item.price * item.quantity;

      vendorBuckets[vendorId].items.push({
        product: item.product,
        quantity: item.quantity,
        price: item.price,
      });

      vendorBuckets[vendorId].total += lineTotal;
    }

    /* ======================================================
       CREATE VENDOR ORDERS WITH SLA + AUTO-ACCEPT
    ====================================================== */
    for (const vendorId in vendorBuckets) {
      const bucket = vendorBuckets[vendorId];

      /* SLA TIMER */
      const acceptBy = new Date(
        Date.now() + VENDOR_ACCEPT_MINUTES * 60 * 1000
      );

      const vendorOrder = await Order.create({
        orderNumber: `ORD_MKT_${Date.now()}_${vendorId.slice(-4)}`,
        user: user._id,
        type: 'MARKETPLACE',
        vendor: bucket.vendor,
        items: bucket.items,
        totalAmount: bucket.total,
        paymentStatus: 'COD',
        paymentGroupId,
        status: 'PLACED',

        sla: {
          acceptBy,
        },
      });

      console.log(
        '🏪 VENDOR ORDER CREATED:',
        vendorOrder._id,
        'VENDOR:',
        vendorId
      );

      /* ================= AUTO-ACCEPT ================= */
      if (bucket.vendorData.autoAcceptOrders) {
        vendorOrder.status = 'ACCEPTED';
        vendorOrder.acceptedAt = new Date();
        await vendorOrder.save();

        console.log('⚡ AUTO-ACCEPTED:', vendorOrder._id);
      }

      orders.push(vendorOrder);
    }

    /* ======================================================
       CLEAR CART (BLINKIT BEHAVIOR)
    ====================================================== */
    cart.isActive = false;
    cart.expressItems = [];
    cart.marketplaceItems = [];
    await cart.save();

    console.log(' CART CLEARED');

    /*  RESPONSE ================= */
    return res.status(200).json({
      message: 'Checkout successful',
      paymentGroupId,
      orderCount: orders.length,
      orders,
    });
  } catch (error) {
    console.error(' MULTI-VENDOR CHECKOUT ERROR:', error);
    return res.status(500).json({
      message: 'Something went wrong during checkout',
    });
  }
};
