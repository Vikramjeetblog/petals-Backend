
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
/* ======================================================
   AUTH SESSION
====================================================== */

exports.me = async (req, res) => {
  return success(res, req.user);
};

exports.logout = async (req, res) => {
  // Stateless JWT logout (client deletes token)
  return success(res, { message: 'Logged out successfully' });
};

/* ======================================================
   SENSITIVE INFO
====================================================== */

exports.getSensitiveInfo = async (req, res) => {
  const rider = await Rider.findById(req.user._id).select('+sensitiveInfo');
  if (!rider)
    return failure(res, 'Rider not found', 'NOT_FOUND', 404);

  return success(res, rider.getMaskedSensitiveInfo());
};

exports.updateSensitiveInfo = async (req, res) => {
  try {
    const { bankAccountNumber, drivingLicenseNumber, bankIfscCode } = req.body;

    if (!bankAccountNumber && !drivingLicenseNumber && !bankIfscCode)
      return failure(res, 'No sensitive fields provided');

    req.user.setSensitiveInfo({
      bankAccountNumber,
      drivingLicenseNumber,
      bankIfscCode,
    });

    await req.user.save();
    return success(res, req.user.getMaskedSensitiveInfo());
  } catch (error) {
    console.error('SENSITIVE UPDATE ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

/* ======================================================
   ORDER DETAIL
====================================================== */

exports.getOrderById = async (req, res) => {
  try {
    const order = await RiderOrder.findOne({
      _id: req.params.orderId,
      rider: req.user._id,
    });

    if (!order)
      return failure(res, 'Order not found', 'NOT_FOUND', 404);

    return success(res, order);
  } catch (error) {
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

/* ======================================================
   EARNINGS
====================================================== */

exports.getEarningsSummary = async (req, res) => {
  try {
    const range = req.query.range || 'today';
    const now = new Date();
    const start = new Date(now);

    if (range === 'today') start.setHours(0, 0, 0, 0);
    if (range === 'week') start.setDate(now.getDate() - 7);
    if (range === 'month') start.setMonth(now.getMonth() - 1);

    const delivered = await RiderOrder.find({
      rider: req.user._id,
      status: 'delivered',
      updatedAt: { $gte: start },
    }).lean();

    const total = delivered.reduce(
      (sum, o) => sum + (o.earning || 0),
      0
    );

    return success(res, {
      range,
      totalEarning: total,
      deliveriesCount: delivered.length,
      avgPerJob: delivered.length
        ? Number((total / delivered.length).toFixed(2))
        : 0,
    });
  } catch (err) {
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.getEarningsActivity = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {
      rider: req.user._id,
      status: 'delivered',
    };

    const [rows, total] = await Promise.all([
      RiderOrder.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RiderOrder.countDocuments(filter),
    ]);

    return success(res, {
      meta: { total, page, pages: Math.ceil(total / limit) },
      rows,
    });
  } catch (err) {
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

/* ======================================================
   WALLET
====================================================== */

exports.getWallet = async (req, res) =>
  success(res, req.user.wallet || { available: 0, pending: 0 });

exports.getPayouts = async (req, res) =>
  success(
    res,
    (req.user.payouts || []).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )
  );

exports.withdrawPayout = async (req, res) => {
  try {
    const { amount, bankAccountId } = req.body;

    if (!amount || Number(amount) <= 0)
      return failure(res, 'Invalid amount');

    if ((req.user.wallet?.available || 0) < amount)
      return failure(res, 'Insufficient balance');

    const bank = (req.user.bankAccounts || []).find(
      (b) => String(b._id) === String(bankAccountId)
    );

    if (!bank)
      return failure(res, 'Bank account not found', 'NOT_FOUND', 404);

    req.user.wallet.available -= Number(amount);
    req.user.payouts.push({
      amount: Number(amount),
      status: 'PENDING',
      date: new Date(),
      bankAccountId,
    });

    await req.user.save();
    return success(res, { message: 'Withdrawal request submitted' }, 201);
  } catch (err) {
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

/* ======================================================
   BANK ACCOUNTS
====================================================== */

exports.getBankAccounts = async (req, res) =>
  success(res, req.user.bankAccounts || []);

exports.addBankAccount = async (req, res) => {
  const { bankName, accountHolderName, accountNumber, ifscCode } = req.body;

  if (!bankName || !accountHolderName || !accountNumber || !ifscCode)
    return failure(res, 'Missing fields');

  req.user.bankAccounts.push({
    bankName,
    accountHolderName,
    accountNumber,
    ifscCode,
  });

  await req.user.save();
  return success(res, req.user.bankAccounts, 201);
};

exports.deleteBankAccount = async (req, res) => {
  const before = req.user.bankAccounts.length;

  req.user.bankAccounts = req.user.bankAccounts.filter(
    (b) => String(b._id) !== String(req.params.bankAccountId)
  );

  if (before === req.user.bankAccounts.length)
    return failure(res, 'Not found', 'NOT_FOUND', 404);

  await req.user.save();
  return success(res, req.user.bankAccounts);
};

/* ======================================================
   KYC
====================================================== */

exports.getKycStatus = async (req, res) =>
  success(res, {
    currentStatus: req.user.kycStatus,
    timeline: req.user.kyc?.timeline || [],
  });

exports.uploadKycDocuments = async (req, res) => {
  const { type, fileUrl } = req.body;

  if (!type || !fileUrl)
    return failure(res, 'type & fileUrl required');

  req.user.kyc.documents.push({
    type,
    fileUrl,
    uploadedAt: new Date(),
  });

  req.user.kycStatus = 'PENDING';
  await req.user.save();

  return success(res, req.user.kyc);
};

exports.uploadKycSelfie = async (req, res) => {
  if (!req.body.fileUrl)
    return failure(res, 'fileUrl required');

  req.user.kyc.selfieUrl = req.body.fileUrl;
  await req.user.save();

  return success(res, req.user.kyc);
};

/* ======================================================
   ONBOARDING
====================================================== */

exports.getOnboardingChecklist = async (req, res) =>
  success(res, req.user.onboardingChecklist || []);

exports.completeOnboardingTask = async (req, res) => {
  const task = req.user.onboardingChecklist.find(
    (t) => t.taskId === req.params.taskId
  );

  if (!task)
    return failure(res, 'Task not found', 'NOT_FOUND', 404);

  task.completed = true;

  req.user.onboardingStatus =
    req.user.onboardingChecklist.every((t) => t.completed)
      ? 'COMPLETED'
      : 'INCOMPLETE';

  await req.user.save();
  return success(res, req.user.onboardingChecklist);
};

/* ======================================================
   NOTIFICATIONS
====================================================== */

exports.getNotifications = async (req, res) =>
  success(res, req.user.notifications || []);

exports.getNotificationById = async (req, res) => {
  const n = req.user.notifications.find(
    (i) => String(i._id) === String(req.params.id)
  );

  if (!n)
    return failure(res, 'Not found', 'NOT_FOUND', 404);

  return success(res, n);
};

exports.markNotificationRead = async (req, res) => {
  const n = req.user.notifications.find(
    (i) => String(i._id) === String(req.params.id)
  );

  if (!n)
    return failure(res, 'Not found', 'NOT_FOUND', 404);

  n.read = true;
  await req.user.save();

  return success(res, n);
};

/* ======================================================
   SUPPORT & TRAINING
====================================================== */

exports.createSupportIssue = async (req, res) => {
  const { subject, description } = req.body;

  if (!subject || !description)
    return failure(res, 'subject & description required');

  return success(
    res,
    {
      id: `SUP-${Date.now()}`,
      subject,
      description,
      status: 'OPEN',
      createdAt: new Date(),
    },
    201
  );
};

exports.getSafetyTraining = async (req, res) =>
  success(res, [
    {
      id: 'safe-1',
      title: 'Road Safety Essentials',
      duration: '15 min',
    },
    {
      id: 'safe-2',
      title: 'Handling Fragile Deliveries',
      duration: '8 min',
    },
  ]);
