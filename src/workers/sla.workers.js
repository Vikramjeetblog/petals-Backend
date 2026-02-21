const Order = require('../models/order/order.model');

const SLA_CHECK_INTERVAL = 30 * 1000;

async function checkExpiredOrders() {
  try {
    const now = new Date();

    const result = await Order.updateMany(
      {
        status: 'PENDING_VENDOR_ACCEPTANCE',
        'sla.acceptBy': { $lt: now },
      },
      {
        $set: {
          status: 'CANCELLED',
          rejectionReason: 'Vendor did not accept within SLA time',
          'sla.acceptedLate': true,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`⏱ SLA AUTO-CANCELLED: ${result.modifiedCount} orders`);
    }
  } catch (err) {
    console.error('SLA WORKER ERROR:', err);
  }
}

module.exports = () => {
  console.log('⏱ SLA Worker Started');
  setInterval(checkExpiredOrders, SLA_CHECK_INTERVAL);
};
