const Order = require('../modules/order/order.model');

const SLA_CHECK_INTERVAL = 30 * 1000; // 30s
const ACCEPT_TIMEOUT = 2 * 60 * 1000; // 2 minutes

async function checkExpiredOrders() {
  try {
    const cutoff = new Date(Date.now() - ACCEPT_TIMEOUT);

    const result = await Order.updateMany(
      {
        status: 'PLACED',
        createdAt: { $lt: cutoff },
      },
      {
        $set: {
          status: 'REJECTED',
          rejectionReason: 'Vendor did not accept within SLA time',
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        ` SLA AUTO-REJECTED: ${result.modifiedCount} orders`
      );
    }
  } catch (err) {
    console.error('SLA WORKER ERROR:', err);
  }
}

module.exports = () => {
  console.log('⏱ SLA Worker Started');
  setInterval(checkExpiredOrders, SLA_CHECK_INTERVAL);
};
