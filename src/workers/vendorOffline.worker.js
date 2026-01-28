const Vendor = require('../models/vendor/vendor.model');


const CHECK_INTERVAL = 30 * 1000; // 30s
const TIMEOUT = 60 * 1000; // 60s

async function checkOfflineVendors() {
  try {
    const cutoff = new Date(Date.now() - TIMEOUT);

    const staleVendors = await Vendor.find({
      isOnline: true,
      lastSeen: { $lt: cutoff }
    });

    for (const vendor of staleVendors) {
      vendor.isOnline = false;
      await vendor.save();

      console.log(
        ' AUTO OFFLINE:',
        vendor.storeName,
        vendor._id.toString()
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
