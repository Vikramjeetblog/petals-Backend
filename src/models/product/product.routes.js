const express = require("express");
const router = express.Router();

const productController = require("./product.controller");

router.get('/search', productController.searchProducts);
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);
router.put("/:id", productController.updateProduct);
router.post("/", productController.createProduct);

module.exports = router;



