const Rider = require('./rider.model');
const RiderOrder = require('./riderOrder.model');
const Otp = require('../auth/otp.service');
const jwt = require('jsonwebtoken');

const success = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const failure = (res, message, code = 'BAD_REQUEST', status = 400) =>
  res.status(status).json({ success: false, message, code });

/* ======================================================
   OTP AUTH
====================================================== */

exports.requestOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return failure(res, 'Phone is required', 'PHONE_REQUIRED');

    await Otp.saveOtp(phone, '1234', 'RIDER'); // Replace with real OTP service
    return success(res, { message: 'OTP sent successfully' });
  } catch (error) {
    console.error('REQUEST OTP ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp)
      return failure(res, 'Phone & OTP required', 'INVALID_PAYLOAD');

    const isValid = await Otp.verifyOtp(phone, otp, 'RIDER');
    if (!isValid) return failure(res, 'Invalid OTP', 'INVALID_OTP');

    let rider = await Rider.findOne({ phone });
    if (!rider) rider = await Rider.create({ phone });

    const token = jwt.sign(
      { userId: rider._id, role: 'RIDER' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return success(res, { token });
  } catch (error) {
    console.error('VERIFY OTP ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

/* ======================================================
   PROFILE
====================================================== */

exports.getProfile = async (req, res) => {
  return success(res, req.user);
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'email', 'vehicleType', 'vehicleNumber'];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        req.user[field] = req.body[field];
      }
    });

    await req.user.save();
    return success(res, req.user);
  } catch (error) {
    console.error('PROFILE UPDATE ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

/* ======================================================
   LOCATION & AVAILABILITY
====================================================== */

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude)
      return failure(res, 'Latitude & longitude required');

    req.user.lastLocation = {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)],
    };

    await req.user.save();
    return success(res, { location: req.user.lastLocation });
  } catch (error) {
    console.error('LOCATION UPDATE ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { isOnline, isAvailable } = req.body;

    if (typeof isOnline === 'boolean')
      req.user.isOnline = isOnline;

    if (typeof isAvailable === 'boolean')
      req.user.isAvailable = isAvailable;

    await req.user.save();
    return success(res, req.user);
  } catch (error) {
    console.error('AVAILABILITY UPDATE ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

/* ======================================================
   RIDER ORDERS
====================================================== */

exports.getOrders = async (req, res) => {
  try {
    const filter = { rider: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const orders = await RiderOrder.find(filter)
      .sort({ createdAt: -1 });

    return success(res, orders);
  } catch (error) {
    console.error('GET ORDERS ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      'assigned',
      'picked',
      'enroute',
      'arrived',
      'delivered',
    ];

    if (!allowedStatuses.includes(status))
      return failure(res, 'Invalid status', 'INVALID_STATUS');

    const order = await RiderOrder.findOne({
      _id: req.params.orderId,
      rider: req.user._id,
    });

    if (!order)
      return failure(res, 'Order not found', 'ORDER_NOT_FOUND', 404);

    order.status = status;
    await order.save();

    return success(res, order);
  } catch (error) {
    console.error('UPDATE ORDER STATUS ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

/* ======================================================
   OTP VERIFICATION WITH SAFETY CHECK
====================================================== */

exports.verifyPickupOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    const order = await RiderOrder.findOne({
      _id: req.params.orderId,
      rider: req.user._id,
    });

    if (!order)
      return failure(res, 'Order not found', 'ORDER_NOT_FOUND', 404);

    if (String(order.pickupOtp) !== String(otp))
      return failure(res, 'Invalid OTP', 'INVALID_OTP');

    order.status = 'picked';
    await order.save();

    return success(res, order);
  } catch (error) {
    console.error('PICKUP OTP ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.verifyDeliveryOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    const order = await RiderOrder.findOne({
      _id: req.params.orderId,
      rider: req.user._id,
    });

    if (!order)
      return failure(res, 'Order not found', 'ORDER_NOT_FOUND', 404);

    if (String(order.deliveryOtp) !== String(otp))
      return failure(res, 'Invalid OTP', 'INVALID_OTP');

    /* ===== Mandatory Photo Proof for Risk Orders ===== */
    const requiresProof =
      order.alert === 'LIVE' || order.alert === 'FRAGILE';

    if (requiresProof && !order.deliveryProof?.photoUrl) {
      return failure(
        res,
        'Photo proof required for fragile/live delivery',
        'PROOF_REQUIRED'
      );
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();

    await order.save();

    return success(res, order);
  } catch (error) {
    console.error('DELIVERY OTP ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

/* ======================================================
   DELIVERY PROOF
====================================================== */

exports.addDeliveryProof = async (req, res) => {
  try {
    const order = await RiderOrder.findOne({
      _id: req.params.orderId,
      rider: req.user._id,
    });

    if (!order)
      return failure(res, 'Order not found', 'ORDER_NOT_FOUND', 404);

    order.deliveryProof = {
      photoUrl: req.body.photoUrl,
      notes: req.body.notes,
      uploadedAt: new Date(),
    };

    await order.save();
    return success(res, order.deliveryProof);
  } catch (error) {
    console.error('DELIVERY PROOF ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};
