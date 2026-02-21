const Order = require('../../order/order.model');
const Vendor = require('../vendor.model');

/* ===============================
   CONFIG / CONSTANTS
=============================== */

const ACCEPTABLE_STATES = ['PLACED', 'PENDING_VENDOR_ACCEPTANCE'];

const STATUS_FLOW = {
  ACCEPTED: ['PLACED', 'PENDING_VENDOR_ACCEPTANCE'],
  REJECTED: ['PLACED', 'PENDING_VENDOR_ACCEPTANCE'],
  PREPARING: ['ACCEPTED'],
  READY: ['PREPARING'],
  DELIVERED: ['READY'],
};

const sendError = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

const sendSuccess = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

/* ===============================
   GET VENDOR ORDERS (Paginated)
=============================== */

exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const status = req.query.status;

    const filter = { vendor: vendorId };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'phone')
        .populate('items.product', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      orders,
    });

  } catch (error) {
    console.error('GET VENDOR ORDERS ERROR:', error);
    return sendError(res, 'Failed to fetch vendor orders', 500);
  }
};

/* ===============================
   GET SINGLE ORDER
=============================== */

exports.getVendorOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      vendor: req.user._id,
    })
      .populate('user', 'phone')
      .populate('items.product', 'name image');

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    return sendSuccess(res, order);

  } catch (error) {
    console.error('GET ORDER DETAIL ERROR:', error);
    return sendError(res, 'Failed to fetch order details', 500);
  }
};

/* ===============================
   ACCEPT ORDER
=============================== */

exports.acceptOrder = async (req, res) => {
  try {
    const { prepTime } = req.body;

    if (!prepTime || Number(prepTime) <= 0) {
      return sendError(res, 'Valid prep time required');
    }

    const vendor = await Vendor.findById(req.user._id);
    if (!vendor || !vendor.isOnline || !vendor.isActive) {
      return sendError(res, 'Vendor offline or inactive', 403);
    }

    const now = new Date();
    const estimatedReadyAt = new Date(
      now.getTime() + Number(prepTime) * 60000
    );

    const order = await Order.findOne({
      _id: req.params.orderId,
      vendor: req.user._id,
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (!STATUS_FLOW.ACCEPTED.includes(order.status)) {
      return sendError(res, 'Order cannot be accepted in current state');
    }

    order.status = 'ACCEPTED';
    order.acceptedAt = now;
    order.prepTimeMinutes = Number(prepTime);
    order.estimatedReadyAt = estimatedReadyAt;

    await order.save();

    return sendSuccess(res, order);

  } catch (error) {
    console.error('ACCEPT ORDER ERROR:', error);
    return sendError(res, 'Failed to accept order', 500);
  }
};

/* ===============================
   REJECT ORDER
=============================== */

exports.rejectOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      vendor: req.user._id,
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (!STATUS_FLOW.REJECTED.includes(order.status)) {
      return sendError(res, 'Order cannot be rejected in current state');
    }

    order.status = 'REJECTED';
    order.rejectionReason = req.body.reason || 'Rejected by vendor';
    await order.save();

    return sendSuccess(res, order);

  } catch (error) {
    console.error('REJECT ORDER ERROR:', error);
    return sendError(res, 'Failed to reject order', 500);
  }
};

/* ===============================
   GENERIC STATUS TRANSITION
=============================== */

const updateStatus = async (req, res, targetStatus) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      vendor: req.user._id,
    });

    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    if (!STATUS_FLOW[targetStatus].includes(order.status)) {
      return sendError(res, `Order cannot move to ${targetStatus}`);
    }

    order.status = targetStatus;

    if (targetStatus === 'PREPARING') {
      order.preparedAt = new Date();
    }

    if (targetStatus === 'READY') {
      order.readyAt = new Date();
    }

    if (targetStatus === 'DELIVERED') {
      order.deliveredAt = new Date();
    }

    await order.save();

    return sendSuccess(res, order);

  } catch (error) {
    console.error('STATUS UPDATE ERROR:', error);
    return sendError(res, 'Failed to update order', 500);
  }
};

exports.markPreparing = (req, res) =>
  updateStatus(req, res, 'PREPARING');

exports.markReady = (req, res) =>
  updateStatus(req, res, 'READY');

exports.markDelivered = (req, res) =>
  updateStatus(req, res, 'DELIVERED');
