const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');
const cartController = require('./cart.controller');

router.post('/add', authMiddleware, cartController.addToCart);

// View cart (express + marketplace split)
router.get('/view', authMiddleware, cartController.viewCart);

// Update quantity (0 = remove)
router.post('/update', authMiddleware, cartController.updateQuantity);

// Remove item explicitly
router.post('/remove', authMiddleware, cartController.removeItem);

// Merge guest cart into user cart
router.post('/merge', authMiddleware, cartController.mergeCart);

module.exports = router;


