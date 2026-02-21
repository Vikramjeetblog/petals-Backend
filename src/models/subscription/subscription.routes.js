const express = require('express');
const auth = require('../middleware/auth.middleware');
const {
  createSubscription,
  getMySubscriptions,
  updateSubscriptionStatus,
} = require('./subscription.controller');

const router = express.Router();

router.post('/', auth, createSubscription);
router.get('/', auth, getMySubscriptions);
router.patch('/:id/status', auth, updateSubscriptionStatus);

module.exports = router;
