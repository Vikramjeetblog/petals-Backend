const mongoose = require('mongoose');
const Order = require('../../order/order.model');
const Vendor = require('../vendor.model');

/* =========================
   HELPERS
========================= */

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const allowedTransitions = {
  PLACED: ['ACCEPTED', 'REJECTED'],
  PENDING_VENDOR_ACCEPTANCE: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PREPARING'],
  PREPARING: ['READY'],
  READY: ['DELIVERED'],
};

const canTransition = (currentStatus, nextStatus) => {
  return allowedTransitions[currentStatus]?.includes(nextStatus);
};

/* =========================
   GET VENDOR ORDERS
========================= */
exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = { vendor: vendorId };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select(
          'orderNumber trackingId status paymentStatus totalAmount createdAt items'
        )
        .populate('user', 'phone')
        .populate('items.product', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Order.countDocuments(filter),
    ]);

    return res.json({
      meta: {
        total,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber),
      },
      data: orders,
    });
  } catch (error) {
    console.error('GET VENDOR ORDERS ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch vendor orders' });
  }
};

/* =========================
   GET SINGLE ORDER
========================= */
exports.getVendorOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const vendorId = req.user._id;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendor: vendorId,
    })
      .populate('user', 'phone')
      .populate('items.product', 'name image');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json(order);
  } catch (error) {
    console.error('GET ORDER DETAIL ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch order details' });
  }
};

/* =========================
   ACCEPT ORDER
========================= */
exports.acceptOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;
    const { prepTime } = req.body;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    if (!prepTime || Number(prepTime) <= 0) {
      return res.status(400).json({ message: 'Valid prep time required' });
    }

    session.startTransaction();

    const vendor = await Vendor.findById(vendorId).session(session);

    if (!vendor || !vendor.isOnline || !vendor.isActive) {
      await session.abortTransaction();
      return res.status(403).json({ message: 'Vendor offline or inactive' });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendor: vendorId,
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!canTransition(order.status, 'ACCEPTED')) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Cannot accept order in ${order.status} state`,
      });
    }

    // SLA Expiry Check
    if (order.sla?.acceptBy && new Date() > order.sla.acceptBy) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'SLA expired. Cannot accept order.',
      });
    }

    const now = new Date();
    order.status = 'ACCEPTED';
    order.acceptedAt = now;
    order.prepTimeMinutes = Number(prepTime);
    order.estimatedReadyAt = new Date(
      now.getTime() + Number(prepTime) * 60000
    );

    await order.save({ session });

    await session.commitTransaction();

    return res.json({ message: 'Order accepted', order });
  } catch (error) {
    await session.abortTransaction();
    console.error('ACCEPT ORDER ERROR:', error);
    return res.status(500).json({ message: 'Failed to accept order' });
  } finally {
    session.endSession();
  }
};

/* =========================
   REJECT ORDER
========================= */
exports.rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const vendorId = req.user._id;
    const { reason } = req.body;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendor: vendorId,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!canTransition(order.status, 'REJECTED')) {
      return res.status(400).json({
        message: `Cannot reject order in ${order.status} state`,
      });
    }

    order.status = 'REJECTED';
    order.rejectionReason = reason || 'Rejected by vendor';
    order.rejectedAt = new Date();

    await order.save();

    return res.json({ message: 'Order rejected', order });
  } catch (error) {
    console.error('REJECT ORDER ERROR:', error);
    return res.status(500).json({ message: 'Failed to reject order' });
  }
};

/* =========================
   MARK PREPARING
========================= */
exports.markPreparing = async (req, res) => {
  try {
    const { orderId } = req.params;
    const vendorId = req.user._id;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendor: vendorId,
    });

    if (!order || !canTransition(order.status, 'PREPARING')) {
      return res.status(400).json({
        message: 'Order must be ACCEPTED first',
      });
    }

    order.status = 'PREPARING';
    order.preparingStartedAt = new Date();

    await order.save();

    return res.json({ message: 'Order is preparing', order });
  } catch (error) {
    console.error('PREPARING ERROR:', error);
    return res.status(500).json({ message: 'Failed to update order' });
  }
};

/* =========================
   MARK READY
========================= */
exports.markReady = async (req, res) => {
  try {
    const { orderId } = req.params;
    const vendorId = req.user._id;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendor: vendorId,
    });

    if (!order || !canTransition(order.status, 'READY')) {
      return res.status(400).json({
        message: 'Order must be PREPARING first',
      });
    }

    order.status = 'READY';
    order.readyAt = new Date();

    await order.save();

    return res.json({ message: 'Order ready', order });
  } catch (error) {
    console.error('READY ERROR:', error);
    return res.status(500).json({ message: 'Failed to update order' });
  }
};

/* =========================
   MARK DELIVERED
========================= */
exports.markDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;
    const vendorId = req.user._id;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findOne({
      _id: orderId,
      vendor: vendorId,
    });

    if (!order || !canTransition(order.status, 'DELIVERED')) {
      return res.status(400).json({
        message: 'Order must be READY first',
      });
    }

    order.status = 'DELIVERED';
    order.deliveredAt = new Date();

    await order.save();

    return res.json({ message: 'Order delivered', order });
  } catch (error) {
    console.error('DELIVER ERROR:', error);
    return res.status(500).json({ message: 'Failed to update order' });
  }
};
