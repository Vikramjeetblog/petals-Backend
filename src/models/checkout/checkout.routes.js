const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { checkout } = require('./checkout.controller');

router.post('/', authMiddleware, checkout);

module.exports = router;
