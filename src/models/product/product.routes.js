const express = require("express");
const router = express.Router();

// ✅ correct relative path
const productController = require("./product.controller");

router.post("/", productController.createProduct);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);
router.put("/:id", productController.updateProduct);
router.get('/search', productController.searchProducts);
module.exports = router;


