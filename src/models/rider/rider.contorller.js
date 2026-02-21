
 const Rider = require('./rider.model');
const RiderOrder = require('./riderOrder.model');
const Otp = require('../auth/otp.service');
const jwt = require('jsonwebtoken');

const success = (res, data, status = 200) => res.status(status).json({ success: true, data });
const failure = (res, message, code = 'BAD_REQUEST', status = 400) =>
 res.status(status).json({ success: false, message, code });

const ensureChecklistDefaults = (rider) => {
 if (!Array.isArray(rider.onboardingChecklist) || rider.onboardingChecklist.length === 0) {
    rider.onboardingChecklist = [
      { taskId: 'profile', label: 'Complete profile', completed: false },
     { taskId: 'kyc', label: 'Submit KYC documents', completed: false },
      { taskId: 'bank', label: 'Add bank account', completed: false },
   ];
 }
};
exports.requestOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return failure(res, 'Phone number is required', 'PHONE_REQUIRED');

    await Otp.saveOtp(phone, '1234', 'RIDER');
    return success(res, { message: 'OTP sent successfully' });
  } catch (error) {
    console.error('RIDER REQUEST OTP ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
     return failure(res, 'Phone and OTP are required', 'PHONE_OTP_REQUIRED');
   }

   const isValid = await Otp.verifyOtp(phone, otp, 'RIDER');
   if (!isValid) return failure(res, 'Invalid OTP', 'INVALID_OTP');

    let rider = await Rider.findOne({ phone });
    if (!rider) rider = await Rider.create({ phone, name: 'New Rider' });

    const token = jwt.sign({ userId: rider._id, role: 'RIDER' }, process.env.JWT_SECRET, {
      expiresIn: '7d',
   });

    return success(res, { token });
  } catch (error) {
    console.error('RIDER VERIFY OTP ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.me = async (req, res) => {
  return success(res, req.user);
};

exports.logout = async (req, res) => {
  return success(res, { message: 'Logged out successfully' });
};
 
 exports.getProfile = async (req, res) => {
  return res.status(200).json({
    message: 'Rider profile fetched successfully',
    rider: req.user,
  });
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
    console.error('RIDER PROFILE UPDATE ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
 };
 
 exports.updateLocation = async (req, res) => {
   try {
     const { latitude, longitude } = req.body;
 
     if (latitude === undefined || longitude === undefined) {
     return res.status(400).json({
        message: 'Latitude and longitude are required',
      });
     return failure(res, 'Latitude and longitude are required', 'LAT_LNG_REQUIRED');
     }
 
     if (Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude))) {
     return res.status(400).json({
       message: 'Latitude and longitude must be valid numbers',
      });
      return failure(res, 'Latitude and longitude must be valid numbers', 'INVALID_LAT_LNG');
     }
 
     req.user.lastLocation = {
       type: 'Point',
       coordinates: [Number(longitude), Number(latitude)],
     };
 
     await req.user.save();
 
    return res.status(200).json({
      message: 'Rider location updated successfully',
     location: req.user.lastLocation,
    });
   return success(res, { location: req.user.lastLocation });
   } catch (error) {
     console.error('RIDER LOCATION UPDATE ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
   }
 };
 
exports.updateAvailability = async (req, res) => {
  try {
    const { isOnline, isAvailable } = req.body;

    if (typeof isOnline !== 'boolean' && typeof isAvailable !== 'boolean')
      return failure(res, 'Provide boolean values');

    if (typeof isOnline === 'boolean')
      req.user.isOnline = isOnline;

    if (typeof isAvailable === 'boolean')
      req.user.isAvailable = isAvailable;

    await req.user.save();
    return success(res, req.user);
  } catch (err) {
    console.error(err);
    return failure(res, 'Server error', 'INTERNAL_ERROR', 500);
  }
};

exports.getOrders = async (req, res) => {
  try {
    const query = { rider: req.user._id };
    if (req.query.status) query.status = req.query.status;

    const orders = await RiderOrder.find(query).sort({ createdAt: -1 });
   return success(res, orders);
  } catch (error) {
   console.error('RIDER ORDERS LIST ERROR:', error);
   return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.getOrderById = async (req, res) => {
  try {
   const order = await RiderOrder.findOne({ _id: req.params.orderId, rider: req.user._id });
    if (!order) return failure(res, 'Order not found', 'ORDER_NOT_FOUND', 404);
    return success(res, order);
  } catch (error) {
   console.error('RIDER ORDER DETAIL ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
 }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['assigned', 'picked', 'enroute', 'arrived', 'delivered'];
    if (!allowedStatuses.includes(status)) {
     return failure(res, 'Invalid status', 'INVALID_STATUS');
     }
 
    if (typeof isAvailable === 'boolean') {
      req.user.isAvailable = isAvailable;
    const order = await RiderOrder.findOne({ _id: req.params.orderId, rider: req.user._id });
   if (!order) return failure(res, 'Order not found', 'ORDER_NOT_FOUND', 404);

   order.status = status;
   await order.save();

   return success(res, order);
  } catch (error) {
    console.error('RIDER ORDER STATUS UPDATE ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};
exports.verifyPickupOtp = async (req, res) => {
  try {
   const { otp } = req.body;
   const order = await RiderOrder.findOne({ _id: req.params.orderId, rider: req.user._id });
    if (!order) return failure(res, 'Order not found', 'ORDER_NOT_FOUND', 404);
   if (String(order.pickupOtp) !== String(otp)) return failure(res, 'Invalid OTP', 'INVALID_OTP');

   order.status = 'picked';
   await order.save();
    return success(res, order);
  } catch (error) {
    console.error('RIDER PICKUP OTP VERIFY ERROR:', error);
   return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.verifyDeliveryOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await RiderOrder.findOne({ _id: req.params.orderId, rider: req.user._id });
    if (!order) return failure(res, 'Order not found', 'ORDER_NOT_FOUND', 404);
    if (String(order.deliveryOtp) !== String(otp)) return failure(res, 'Invalid OTP', 'INVALID_OTP');

    order.status = 'delivered';
    await order.save();
    return success(res, order);
  } catch (error) {
    console.error('RIDER DELIVERY OTP VERIFY ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
 }
};

exports.addDeliveryProof = async (req, res) => {
  try {
    const order = await RiderOrder.findOne({ _id: req.params.orderId, rider: req.user._id });
    if (!order) return failure(res, 'Order not found', 'ORDER_NOT_FOUND', 404);

   order.deliveryProof = {
      photoUrl: req.body.photoUrl || null,
      notes: req.body.notes || null,
      uploadedAt: new Date(),
    };
    await order.save();

    return success(res, order.deliveryProof);
  } catch (error) {
    console.error('RIDER DELIVERY PROOF ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.getEarningsSummary = async (req, res) => {
  try {
    const range = req.query.range || 'today';
    const now = new Date();
    const start = new Date(now);

   if (range === 'today') start.setHours(0, 0, 0, 0);
   if (range === 'week') start.setDate(now.getDate() - 7);
    if (range === 'month') start.setMonth(now.getMonth() - 1);

   const deliveredOrders = await RiderOrder.find({
     rider: req.user._id,
     status: 'delivered',
      updatedAt: { $gte: start },
  });

   const total = deliveredOrders.reduce((sum, item) => sum + (item.earning || 0), 0);
    const count = deliveredOrders.length;

    return success(res, {
      range,
   totalEarning: total,
     deliveriesCount: count,
      avgPerJob: count ? Number((total / count).toFixed(2)) : 0,
    });
  } catch (error) {
    console.error('RIDER EARNINGS SUMMARY ERROR:', error);
   return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
 }
};

exports.getEarningsActivity = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
   const pageSize = Number(req.query.pageSize || 20);
    const skip = (page - 1) * pageSize;

   const filter = { rider: req.user._id, status: 'delivered' };
    const [rows, total] = await Promise.all([
     RiderOrder.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(pageSize),
     RiderOrder.countDocuments(filter),
   ]);

   return res.status(200).json({ success: true, data: rows, page, pageSize, total });
  } catch (error) {
   console.error('RIDER EARNINGS ACTIVITY ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
 }
};

exports.getWallet = async (req, res) => success(res, req.user.wallet || { available: 0, pending: 0 });

exports.getPayouts = async (req, res) => {
  const payouts = (req.user.payouts || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  return success(res, payouts);
};

exports.withdrawPayout = async (req, res) => {
  try {
    const { amount, bankAccountId } = req.body;
    if (!amount || Number(amount) <= 0) return failure(res, 'Invalid amount', 'INVALID_AMOUNT');

   const bankAccount = (req.user.bankAccounts || []).find((item) => String(item._id) === String(bankAccountId));
    if (!bankAccount) return failure(res, 'Bank account not found', 'BANK_ACCOUNT_NOT_FOUND', 404);

   if ((req.user.wallet?.available || 0) < Number(amount)) {
      return failure(res, 'Insufficient wallet balance', 'INSUFFICIENT_BALANCE');
     }
 
   req.user.wallet.available -= Number(amount);
   req.user.payouts = req.user.payouts || [];
    req.user.payouts.push({ amount: Number(amount), status: 'PENDING', date: new Date(), bankAccountId });
     await req.user.save();
 
  return res.status(200).json({
     message: 'Rider availability updated successfully',
     rider: req.user,
   });
   return success(res, { message: 'Withdrawal request submitted' }, 201);
   } catch (error) {
    console.error('RIDER AVAILABILITY UPDATE ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
    console.error('RIDER WITHDRAW PAYOUT ERROR:', error);
   return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
 }
};

exports.getBankAccounts = async (req, res) => success(res, req.user.bankAccounts || []);

exports.addBankAccount = async (req, res) => {
  try {
    const { bankName, accountHolderName, accountNumber, ifscCode, isPrimary } = req.body;
    if (!bankName || !accountHolderName || !accountNumber || !ifscCode) {
     return failure(res, 'Missing required fields', 'MISSING_FIELDS');
   }

    if (isPrimary) {
     req.user.bankAccounts = (req.user.bankAccounts || []).map((item) => ({ ...item.toObject(), isPrimary: false }));
   }

   req.user.bankAccounts.push({ bankName, accountHolderName, accountNumber, ifscCode, isPrimary: !!isPrimary });
   await req.user.save();

    return success(res, req.user.bankAccounts, 201);
  } catch (error) {
    console.error('RIDER ADD BANK ACCOUNT ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
 }
};

exports.deleteBankAccount = async (req, res) => {
  try {
    const before = (req.user.bankAccounts || []).length;
   req.user.bankAccounts = (req.user.bankAccounts || []).filter(
     (item) => String(item._id) !== String(req.params.bankAccountId)
    );

    if (req.user.bankAccounts.length === before) {
      return failure(res, 'Bank account not found', 'BANK_ACCOUNT_NOT_FOUND', 404);
    }

    await req.user.save();
    return success(res, req.user.bankAccounts);
  } catch (error) {
   console.error('RIDER DELETE BANK ACCOUNT ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.getKycStatus = async (req, res) => {
 return success(res, {
   currentStatus: req.user.kycStatus,
    timeline: req.user.kyc?.timeline || [],
  });
};

exports.uploadKycDocuments = async (req, res) => {
  try {
    const { type, fileUrl } = req.body;
    if (!type || !fileUrl) return failure(res, 'type and fileUrl are required', 'MISSING_FIELDS');

   req.user.kyc = req.user.kyc || {};
    req.user.kyc.documents = req.user.kyc.documents || [];
    req.user.kyc.documents.push({ type, fileUrl, uploadedAt: new Date() });
    req.user.kycStatus = 'PENDING';
    req.user.kyc.timeline = req.user.kyc.timeline || [];
    req.user.kyc.timeline.push({ status: 'PENDING', note: 'Documents submitted', at: new Date() });

    await req.user.save();
   return success(res, req.user.kyc);
 } catch (error) {
    console.error('RIDER KYC DOCUMENT UPLOAD ERROR:', error);
   return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.uploadKycSelfie = async (req, res) => {
  try {
   const { fileUrl } = req.body;
   if (!fileUrl) return failure(res, 'fileUrl is required', 'MISSING_FIELDS');

   req.user.kyc = req.user.kyc || {};
    req.user.kyc.selfieUrl = fileUrl;
    await req.user.save();

    return success(res, req.user.kyc);
  } catch (error) {
    console.error('RIDER KYC SELFIE UPLOAD ERROR:', error);
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
   }
 };
 
exports.getOnboardingChecklist = async (req, res) => {
 ensureChecklistDefaults(req.user);
  await req.user.save();
  return success(res, req.user.onboardingChecklist);
};

exports.completeOnboardingTask = async (req, res) => {
  try {
    ensureChecklistDefaults(req.user);

    const task = req.user.onboardingChecklist.find((item) => item.taskId === req.params.taskId);
    if (!task) return failure(res, 'Task not found', 'TASK_NOT_FOUND', 404);

    task.completed = true;
   req.user.onboardingStatus = req.user.onboardingChecklist.every((item) => item.completed)
     ? 'COMPLETED'
     : 'INCOMPLETE';

   await req.user.save();
   return success(res, req.user.onboardingChecklist);+  } catch (error) {
    console.error('RIDER COMPLETE CHECKLIST TASK ERROR:', error);
   return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
  }
};

exports.getNotifications = async (req, res) => {
  const rows = (req.user.notifications || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return success(res, rows);
};

exports.getNotificationById = async (req, res) => {
  const row = (req.user.notifications || []).find((item) => String(item._id) === String(req.params.id));
  if (!row) return failure(res, 'Notification not found', 'NOTIFICATION_NOT_FOUND', 404);
  return success(res, row);
};

exports.markNotificationRead = async (req, res) => {
  const row = (req.user.notifications || []).find((item) => String(item._id) === String(req.params.id));
  if (!row) return failure(res, 'Notification not found', 'NOTIFICATION_NOT_FOUND', 404);

  row.read = true;
  await req.user.save();
  return success(res, row);
};

exports.createSupportIssue = async (req, res) => {
  const { subject, description } = req.body;
  if (!subject || !description) return failure(res, 'subject and description are required', 'MISSING_FIELDS');

 return success(
    res,
    {
      id: `SUP-${Date.now()}`,
     subject,
     description,
     status: 'OPEN',
     createdAt: new Date().toISOString(),
   },
    201
  );
};

exports.getSafetyTraining = async (req, res) => {
  return success(res, [
   {
      id: 'safe-1',
     title: 'Road Safety Essentials',
      duration: '15 min',
     url: 'https://example.com/safety/road-essentials',
    },
    {
     id: 'safe-2',
      title: 'Handling Fragile Deliveries',
      duration: '8 min',
      url: 'https://example.com/safety/fragile-deliveries',
    },
  ]);
};

 exports.updateSensitiveInfo = async (req, res) => {
   try {
     const { bankAccountNumber, drivingLicenseNumber, bankIfscCode } = req.body;
 
     if (
       typeof bankAccountNumber !== 'string' &&
       typeof drivingLicenseNumber !== 'string' &&
       typeof bankIfscCode !== 'string'
     ) {
      return res.status(400).json({
        message: 'Provide at least one sensitive field as string',
      });
     return failure(res, 'Provide at least one sensitive field as string', 'INVALID_PAYLOAD');
     }
 
     req.user.setSensitiveInfo({
       bankAccountNumber,
       drivingLicenseNumber,
       bankIfscCode,
     });
 
     await req.user.save();
 
    return res.status(200).json({
     message: 'Sensitive rider information updated securely',
      sensitiveInfo: req.user.getMaskedSensitiveInfo(),
    });
    return success(res, req.user.getMaskedSensitiveInfo());
   } catch (error) {
     console.error('RIDER SENSITIVE INFO UPDATE ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
   }
 };
 
 exports.getSensitiveInfo = async (req, res) => {
   try {
     const rider = await Rider.findById(req.user._id).select('+sensitiveInfo');
 
    if (!rider) {
     return res.status(404).json({ message: 'Rider not found' });
   }
    if (!rider) return failure(res, 'Rider not found', 'RIDER_NOT_FOUND', 404);
 
    return res.status(200).json({
      message: 'Sensitive rider information fetched securely',
     sensitiveInfo: rider.getMaskedSensitiveInfo(),
   });
    return success(res, rider.getMaskedSensitiveInfo());
   } catch (error) {
     console.error('RIDER SENSITIVE INFO FETCH ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
    return failure(res, 'Something went wrong', 'INTERNAL_ERROR', 500);
   }
 };
