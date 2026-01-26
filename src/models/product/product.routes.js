const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const productController = require("./product.controller");


router.post("/", authMiddleware, productController.createProduct);
router.get("/",  authMiddleware, productController.getProducts);
router.put("/:id",  authMiddleware, productController.updateProduct);
router.patch("/:id/toggle",  authMiddleware, productController.toggleProduct);

module.exports = router;


