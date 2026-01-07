// src/models/vendor/vendor.model.js
const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  name: String
});

module.exports = mongoose.model('Vendor', VendorSchema);
