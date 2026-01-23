const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const vendorCandidateOnly = require('../middleware/vendorCandidateOnly.middleware');
const VendorOnly = require('../middleare/VendorOnly.middleware');
// 🔥 Import split vendor controllers (barrel file)
const vendor = require('./index');

/* ============================
   PROFILE / ONBOARDING
============================ */
router.get('/me', auth, vendorCandidateOnly, vendor.profile.me);
router.patch('/online', auth, vendorOnly, vendor.profile.toggleOnline);
router.patch('/store', auth, vendorOnly, vendor.profile.updateStoreInfo);
router.patch('/location', auth, vendorOnly, vendor.profile.updateLocation);
router.patch('/payout', auth, vendorOnly, vendor.profile.updatePayoutDetails);

/* ============================
   DASHBOARD STATS
============================ */
router.get('/stats', auth, vendorOnly, vendor.stats.getStats);

/* ============================
   ORDERS
============================ */
router.get('/orders', auth, vendorOnly, vendor.orders.getVendorOrders);
router.get('/orders/:orderId', auth, vendorOnly, vendor.orders.getVendorOrderById);

router.post('/orders/:orderId/accept', auth, vendorOnly, vendor.orders.acceptOrder);
router.post('/orders/:orderId/reject', auth, vendorOnly, vendor.orders.rejectOrder);
router.post('/orders/:orderId/preparing', auth, vendorOnly, vendor.orders.markPreparing);
router.post('/orders/:orderId/ready', auth, vendorOnly, vendor.orders.markReady);

/* ============================
   PRODUCTS
============================ */
router.get('/products', auth, vendorOnly, vendor.products.getProducts);
router.post('/products/:id/toggle-stock', auth, vendorOnly, vendor.products.toggleStock);

/* ============================
   EARNINGS
============================ */
router.get('/earnings', auth, vendorOnly, vendor.earnings.getEarnings);
router.post('/earnings/payout', auth, vendorOnly, vendor.earnings.requestPayout);

module.exports = router;


