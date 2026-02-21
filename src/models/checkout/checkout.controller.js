const Cart = require('../cart/cart.model');
const Order = require('../order/order.model');
const crypto = require('crypto');
const { VENDOR_ACCEPT_MINUTES } = require('../../config/sla.config');

const generatePrefixedId = (prefix) =>
  `${prefix}_${crypto.randomUUID().split('-')[0].toUpperCase()}`;

/* ======================================================
   MULTI-VENDOR CHECKOUT (SPLIT ORDER + TRACKING)
====================================================== */
exports.checkout = async (req, res) => {
  try {
    const user = req.user;

    const cart = await Cart.findOne({
      user: user._id,
      isActive: true,
    }).populate('marketplaceItems.vendor');

    if (!cart) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    if (cart.expressItems.length === 0 && cart.marketplaceItems.length === 0) {
      return res.status(400).json({ message: 'Cart has no items' });
    }

    const paymentGroupId = generatePrefixedId('PG');
    const parentOrderId = generatePrefixedId('PO');
    const orders = [];

    /* ================= EXPRESS ORDER ================= */
    if (cart.expressItems.length > 0) {
      let total = 0;

      const items = cart.expressItems.map((item) => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;

        return {
          product: item.product,
          quantity: item.quantity,
          price: item.price,
        };
      });

      const expressOrder = await Order.create({
        orderNumber: generatePrefixedId('ORD_EXP'),
        paymentGroupId,
        parentOrderId,
        trackingId: generatePrefixedId('TRK_EXP'),
        user: user._id,
        vendor: null,
        type: 'EXPRESS',
        fulfillmentSource: 'STORE',
        items,
        totalAmount: total,
        paymentStatus: 'PAID',
        status: 'PLACED',
      });

      orders.push(expressOrder);
    }

    /* ================= GROUP MARKETPLACE ITEMS ================= */
    const vendorBuckets = {};

    for (const item of cart.marketplaceItems) {
      if (!item.vendor) {
        return res.status(400).json({
          message: 'Marketplace item missing vendor',
        });
      }

      const vendorId = item.vendor._id.toString();

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

    /* ================= CREATE VENDOR ORDERS ================= */
    for (const vendorId in vendorBuckets) {
      const bucket = vendorBuckets[vendorId];
      const acceptBy = new Date(
        Date.now() + VENDOR_ACCEPT_MINUTES * 60 * 1000
      );

      const vendorOrder = await Order.create({
        orderNumber: generatePrefixedId('ORD_MKT'),
        paymentGroupId,
        parentOrderId,
        trackingId: generatePrefixedId('TRK_MKT'),
        user: user._id,
        type: 'MARKETPLACE',
        fulfillmentSource: 'VENDOR',
        vendor: bucket.vendor,
        items: bucket.items,
        totalAmount: bucket.total,
        paymentStatus: 'COD',
        status: 'PENDING_VENDOR_ACCEPTANCE',
        sla: { acceptBy },
      });

      if (bucket.vendorData.autoAcceptOrders) {
        vendorOrder.status = 'ACCEPTED';
        vendorOrder.acceptedAt = new Date();
        await vendorOrder.save();
      }

      orders.push(vendorOrder);
    }

    /* ================= CLEAR CART ================= */
    cart.isActive = false;
    cart.expressItems = [];
    cart.marketplaceItems = [];
    await cart.save();

    return res.status(200).json({
      message: 'Checkout successful',
      paymentGroupId,
      parentOrderId,
      orderCount: orders.length,
      orders,
    });
  } catch (error) {
    console.error('MULTI-VENDOR CHECKOUT ERROR:', error);
    return res.status(500).json({
      message: 'Something went wrong during checkout',
    });
  }
};
