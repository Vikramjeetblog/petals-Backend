const Order = require('../modules/order/order.model');

const SLA_CHECK_INTERVAL = 30 * 1000; // 30 seconds

async function checkExpiredOrders() {
  try {
    const now = new Date();

    const expiredOrders = await Order.find({
      status: 'PLACED',
      'sla.acceptBy': { $lte: now },
    });

    for (const order of expiredOrders) {
      order.status = 'REJECTED';
      order.rejectionReason = 'Vendor did not accept within SLA time';

      await order.save();

      console.log(' SLA AUTO-REJECTED ORDER:', order._id);

      // FUTURE:
      // notifyVendor(order.vendor)
      // notifyAdmin(order)
    }
  } catch (err) {
    console.error(' SLA WORKER ERROR:', err);
  }
}

module.exports = () => {
  console.log(' SLA Worker Started');
  setInterval(checkExpiredOrders, SLA_CHECK_INTERVAL);
};
