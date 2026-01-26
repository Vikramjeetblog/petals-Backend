const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const productController = require("./product.controller");

router.use(auth);

router.post("/", productController.createProduct);
router.get("/", productController.getProducts);
router.put("/:id", productController.updateProduct);
router.patch("/:id/toggle", productController.toggleProduct);

module.exports = router;

