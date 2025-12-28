const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');
const { addToCart,viewCart,updateQuantity } = require('./cart.controller');

router.post('/add', authMiddleware, addToCart);
router.get('/',authMiddleware,viewCart);
router.patch('/update', authMiddleware, updateQuantity);
module.exports = router;
