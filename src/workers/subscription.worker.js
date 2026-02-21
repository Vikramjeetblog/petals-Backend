const { runRecurringOrders } = require('../models/subscription/subscription.controller');

const ONE_MIN = 60 * 1000;

function shouldRunNow(date) {
  return date.getHours() === 2 && date.getMinutes() === 0;
}

module.exports = () => {
  console.log('⏰ Subscription worker started');

  setInterval(async () => {
    const now = new Date();
    if (!shouldRunNow(now)) return;

    try {
      const created = await runRecurringOrders();
      if (created > 0) {
        console.log(`📦 Subscription worker created ${created} recurring order(s)`);
      }
    } catch (error) {
      console.error('SUBSCRIPTION WORKER ERROR:', error);
    }
  }, ONE_MIN);
}
