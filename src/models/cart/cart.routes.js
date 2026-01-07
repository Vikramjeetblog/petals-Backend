const express = require('express');
const router = express.Router();


const cartController = require('./cart.controller');

router.post('/add',  cartController.addToCart);

// View cart (express + marketplace split)
router.get('/view',  cartController.viewCart);

// Update quantity (0 = remove)
router.post('/update',  cartController.updateQuantity);

// Remove item explicitly
router.post('/remove', cartController.removeItem);

// Merge guest cart into user cart
router.post('/merge',  cartController.mergeCart);

module.exports = router;


