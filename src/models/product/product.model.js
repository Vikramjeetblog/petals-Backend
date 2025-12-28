const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    /**
     * EXPRESS or MARKETPLACE
     */
    fulfillmentType: {
      type: String,
      enum: ['EXPRESS', 'MARKETPLACE'],
      required: true
    },

    /**
     * Only for MARKETPLACE products
     */
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', ProductSchema);
