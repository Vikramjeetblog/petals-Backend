
const Order = require('../../order/order.model');

exports.getStats = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      vendor: vendorId,
      createdAt: { $gte: today },
    });

    const todayOrders = orders.length;

    const pendingOrders = orders.filter(o =>
      ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)
    ).length;

    const todayEarnings = orders
      .filter(o => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return res.json({
      todayOrders,
      pendingOrders,
      todayEarnings,
    });
  } catch (err) {
    console.error('❌ STATS ERROR:', err);
    return res.status(500).json({ message: 'Failed to load stats' });
  }
};


