const express = require('express');
const auth = require('../middleware/auth.middleware');
const {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
} = require('./payment.controller');

const router = express.Router();

router.post('/create-order', auth, createPaymentOrder);
router.post('/verify', auth, verifyPayment);
router.post('/webhook', handleWebhook);

module.exports = router;
