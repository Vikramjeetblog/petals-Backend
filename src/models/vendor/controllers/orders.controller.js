const Order = require('../../order/order.model');
const Vendor = require('../vendor.model');

/* =========================
   GET VENDOR ORDERS
========================= */
exports.getVendorOrders = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { vendor: vendorId };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'phone')
        .populate('items.product', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    return res.json({
      meta: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
      data: orders,
    });
  } catch (error) {
    console.error('❌ GET VENDOR ORDERS ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch vendor orders' });
  }
};

/* =========================
   GET SINGLE ORDER
========================= */
exports.getVendorOrderById = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;

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
    console.error('❌ GET ORDER DETAIL ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch order details' });
  }
};

/* =========================
   ACCEPT ORDER
========================= */
exports.acceptOrder = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;
    const { prepTime } = req.body;

    if (!prepTime || Number(prepTime) <= 0) {
      return res.status(400).json({ message: 'Prep time required' });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || !vendor.isOnline || !vendor.isActive) {
      return res.status(403).json({ message: 'Vendor offline or inactive' });
    }

    const now = new Date();
    const estimatedReadyAt = new Date(
      now.getTime() + Number(prepTime) * 60000
    );

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        vendor: vendorId,
        status: { $in: ['PLACED', 'PENDING_VENDOR_ACCEPTANCE'] }, // ✅ UPDATED
      },
      {
        $set: {
          status: 'ACCEPTED',
          acceptedAt: now,
          prepTimeMinutes: Number(prepTime),
          estimatedReadyAt,
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ message: 'Order cannot be accepted' });
    }

    return res.json({ message: 'Order accepted', order });
  } catch (error) {
    console.error('❌ ACCEPT ORDER ERROR:', error);
    return res.status(500).json({ message: 'Failed to accept order' });
  }
};

/* =========================
   REJECT ORDER
========================= */
exports.rejectOrder = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      vendor: vendorId,
      status: { $in: ['PLACED', 'PENDING_VENDOR_ACCEPTANCE'] }, // ✅ UPDATED
    });

    if (!order) {
      return res.status(400).json({ message: 'Order cannot be rejected' });
    }

    order.status = 'REJECTED';
    order.rejectionReason = reason || 'Rejected by vendor';
    await order.save();

    return res.json({ message: 'Order rejected', order });
  } catch (error) {
    console.error('❌ REJECT ORDER ERROR:', error);
    return res.status(500).json({ message: 'Failed to reject order' });
  }
};

/* =========================
   MARK PREPARING
========================= */
exports.markPreparing = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      vendor: vendorId,
      status: 'ACCEPTED',
    });

    if (!order) {
      return res.status(400).json({ message: 'Order must be ACCEPTED first' });
    }

    order.status = 'PREPARING';
    order.preparedAt = new Date();
    await order.save();

    return res.json({ message: 'Order is preparing', order });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update order' });
  }
};

/* =========================
   MARK READY
========================= */
exports.markReady = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      vendor: vendorId,
      status: 'PREPARING',
    });

    if (!order) {
      return res.status(400).json({ message: 'Order must be PREPARING first' });
    }

    order.status = 'READY';
    order.readyAt = new Date();
    await order.save();

    return res.json({ message: 'Order ready', order });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update order' });
  }
};

exports.markDelivered = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { orderId } = req.params;

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        vendor: vendorId,
        status: 'READY',
      },
      {
        $set: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({
        message: 'Order must be READY first',
      });
    }

    return res.json({ message: 'Order delivered', order });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update order' });
  }
};
