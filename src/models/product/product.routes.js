const express = require("express");
const router = express.Router();

//  correct relative path
const productController = require("./product.controller");

router.post("/", productController.createProduct);
router.get("/", productController.getProducts);
router.put("/:id", productController.updateProduct);

module.exports = router;
