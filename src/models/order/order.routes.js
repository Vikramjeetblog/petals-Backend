const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

const { placeOrder, getMyOrders } = require('./order.controller');

router.post('/place', authMiddleware, placeOrder);
router.get('/', authMiddleware, getMyOrders);

module.exports = router;
