const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth.middleware');
const vendorCandidateOnly = require('../middleware/vendorCandidateOnly.middleware');
const vendorOnly = require('../middleware/vendorOnly.middleware');

const vendor = require('./index');

/* ============================
   PROFILE / ONBOARDING
============================ */
router.post('/heartbeat', auth, vendorOnly, vendor.profile.heartbeat);

router.get('/me', auth, vendorCandidateOnly, vendor.profile.me);

// onboarding steps should be allowed for PENDING vendors
router.patch('/online', auth, vendorCandidateOnly, vendor.profile.setOnlineStatus);
router.patch('/store', auth, vendorCandidateOnly, vendor.profile.updateStoreInfo);
router.patch('/location', auth, vendorCandidateOnly, vendor.profile.updateLocation);
router.patch('/payout', auth, vendorCandidateOnly, vendor.profile.updatePayoutDetails);

/* ============================
   DASHBOARD STATS (APPROVED ONLY)
============================ */
router.get('/stats', auth, vendorOnly, vendor.stats.getStats);

/* ============================
   ORDERS (APPROVED ONLY)
============================ */
router.get('/orders', auth, vendorOnly, vendor.orders.getVendorOrders);
router.get('/orders/:orderId', auth, vendorOnly, vendor.orders.getVendorOrderById);

router.post('/orders/:orderId/accept', auth, vendorOnly, vendor.orders.acceptOrder);
router.post('/orders/:orderId/reject', auth, vendorOnly, vendor.orders.rejectOrder);
router.post('/orders/:orderId/preparing', auth, vendorOnly, vendor.orders.markPreparing);
router.post('/orders/:orderId/ready', auth, vendorOnly, vendor.orders.markReady);

/* ============================
   PRODUCTS (APPROVED ONLY)
============================ */
router.get('/products', auth, vendorOnly, vendor.products.getProducts);
router.post('/products/:id/toggle-stock', auth, vendorOnly, vendor.products.toggleStock);
router.post('/products', auth, vendorOnly, vendor.products.createProduct);
router.put('/products/:id', auth, vendorOnly, vendor.products.updateProduct);
router.delete('/products/:id', auth, vendorOnly, vendor.products.deleteProduct);

/* ============================
   EARNINGS (APPROVED ONLY)
============================ */
router.get('/earnings', auth, vendorOnly, vendor.earnings.getEarnings);
router.post('/earnings/payout', auth, vendorOnly, vendor.earnings.requestPayout);

module.exports = router;




