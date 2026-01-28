const Vendor = require('../models/vendor/vendor.model');

const CHECK_INTERVAL = 30 * 1000; // 30s
const TIMEOUT = 60 * 1000; // 60s

async function checkOfflineVendors() {
  try {
    const cutoff = new Date(Date.now() - TIMEOUT);

    const result = await Vendor.updateMany(
      {
        isOnline: true,
        lastSeen: { $lt: cutoff },
      },
      {
        $set: { isOnline: false },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        ` AUTO OFFLINE: ${result.modifiedCount} vendors`
      );
    }
  } catch (err) {
    console.error('OFFLINE WORKER ERROR:', err);
  }
}

module.exports = () => {
  console.log('🫀 Vendor Offline Worker Started');
  setInterval(checkOfflineVendors, CHECK_INTERVAL);
};
