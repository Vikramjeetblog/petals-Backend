const Vendor = require('../vendor.model');

/* ======================================================
   GET VENDOR PROFILE (ONBOARDING + HEADER INFO)
====================================================== */


exports.heartbeat = async (req, res) => {
  try {
    const vendorId = req.user._id;

    await Vendor.findByIdAndUpdate(vendorId, {
      lastSeen: new Date(),
      isOnline: true
    });

    return res.json({
      success: true,
      message: 'Heartbeat received'
    });
  } catch (err) {
    console.error('HEARTBEAT ERROR:', err);
    return res.status(500).json({
      success: false,
      message: 'Heartbeat failed'
    });
  }
};

exports.me = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user._id).select(
      'name storeName onboardingStatus isOnline isActive categories description email phone payout location'
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error('❌ VENDOR ME ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load vendor profile',
    });
  }
};

/* ======================================================
   TOGGLE ONLINE / OFFLINE STATUS
====================================================== */
exports.setOnlineStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isOnline must be true or false',
      });
    }

    const vendor = await Vendor.findById(req.user._id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Only update if changed
    if (vendor.isOnline !== isOnline) {
      vendor.isOnline = isOnline;
      await vendor.save();
    }

    return res.status(200).json({
      success: true,
      message: `Vendor is now ${vendor.isOnline ? 'ONLINE' : 'OFFLINE'}`,
      isOnline: vendor.isOnline,
    });
  } catch (error) {
    console.error('❌ SET ONLINE ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update vendor status',
    });
  }
};

/* ======================================================
   UPDATE STORE INFO
   Used for onboarding form + settings screen
====================================================== */
exports.updateStoreInfo = async (req, res) => {
  try {
    const allowedFields = [
      'storeName',
      'description',
      'categories',
      'storeImage',
      'email',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const vendor = await Vendor.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // 🔥 DEV MODE AUTO-APPROVAL
    // In production, REMOVE this block.
    // Vendor approval must be handled by Admin Panel workflow.
    if (vendor.onboardingStatus !== 'APPROVED') {
      vendor.onboardingStatus = 'APPROVED';
      await vendor.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      data: vendor,
    });
  } catch (error) {
    console.error('❌ UPDATE STORE ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update store information',
    });
  }
};

/* ======================================================
   UPDATE VENDOR LOCATION (STORE LOCATION)
====================================================== */
exports.updateLocation = async (req, res) => {
  try {
    const { address, city, state, pincode, latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const vendor = await Vendor.findById(req.user._id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    vendor.location = {
      address,
      city,
      state,
      pincode,
      coordinates: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },
    };

    // 🔥 DEV MODE AUTO-APPROVAL
    // In production, REMOVE this block.
    // Admin must verify location before approving vendor.
    if (vendor.onboardingStatus !== 'APPROVED') {
      vendor.onboardingStatus = 'APPROVED';
    }

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      location: vendor.location,
      onboardingStatus: vendor.onboardingStatus,
    });
  } catch (error) {
    console.error('❌ UPDATE LOCATION ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update location',
    });
  }
};

/* ======================================================
   UPDATE PAYOUT DETAILS (BANK INFO)
====================================================== */
exports.updatePayoutDetails = async (req, res) => {
  try {
    const { bankName, accountNumber, ifsc, holderName } = req.body;

    if (!bankName || !accountNumber || !ifsc || !holderName) {
      return res.status(400).json({
        success: false,
        message: 'All bank fields are required',
      });
    }

    const vendor = await Vendor.findById(req.user._id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    vendor.payout = {
      bankName,
      accountNumber,
      ifsc,
      holderName,
    };

    // 🔥 DEV MODE AUTO-APPROVAL
    // In production, REMOVE this block.
    // Admin must verify bank details before approving vendor.
    if (vendor.onboardingStatus !== 'APPROVED') {
      vendor.onboardingStatus = 'APPROVED';
    }

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Payout details updated',
      payout: vendor.payout,
      onboardingStatus: vendor.onboardingStatus,
    });
  } catch (error) {
    console.error('❌ PAYOUT ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payout details',
    });
  }
};


