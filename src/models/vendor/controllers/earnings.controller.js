const Order = require('../../order/order.model');
const Vendor = require('../vendor.model');

/* ======================================================
   GET VENDOR EARNINGS + SETTLEMENT HISTORY
====================================================== */
exports.getEarnings = async (req, res) => {
  try {
    const vendorId = req.user._id;

    // Only delivered orders count as earnings
    const orders = await Order.find({
      vendor: vendorId,
      status: 'DELIVERED',
    }).sort({ deliveredAt: -1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;

    const settlements = [];

    orders.forEach((order) => {
      const amount = order.totalAmount || 0;
      const date = new Date(order.deliveredAt || order.updatedAt);

      if (date >= today) todayTotal += amount;
      if (date >= weekAgo) weekTotal += amount;
      if (date >= monthAgo) monthTotal += amount;

      settlements.push({
        id: order._id,
        date: date.toISOString().split('T')[0],
        amount,
        status: 'PAID', // Prototype: always paid
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          today: todayTotal,
          thisWeek: weekTotal,
          thisMonth: monthTotal,
        },
        settlements,
      },
    });
  } catch (error) {
    console.error('❌ EARNINGS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load earnings',
    });
  }
};

/* ======================================================
   REQUEST PAYOUT (FUTURE / OPTIONAL)
====================================================== */
exports.requestPayout = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payout amount required',
      });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor || !vendor.payout?.accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Payout details not configured',
      });
    }

    // 🔥 Prototype behavior
    // In production, create a payout record + send to Razorpay/Stripe/Bank API
    return res.status(200).json({
      success: true,
      message: 'Payout request submitted',
      data: {
        amount,
        status: 'PROCESSING',
      },
    });
  } catch (error) {
    console.error('❌ PAYOUT REQUEST ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to request payout',
    });
  }
};
