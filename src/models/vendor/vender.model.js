const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  name: { type: String, required: true },

  categories: [String], // Pets, Sweets, Flowers

  isActive: { type: Boolean, default: true },

  autoAcceptOrders: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Vendor', VendorSchema);
