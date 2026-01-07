const mongoose = require('mongoose');

/* ================= CART ITEM ================= */
const CartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    price: {
      type: Number,
      required: true,
      immutable: true
    }
  },
  { _id: false }
);

/* ================= CART ================= */
const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    assignedStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null
    },

    expressItems: {
      type: [CartItemSchema],
      default: []
    },

    marketplaceItems: {
      type: [
        {
          ...CartItemSchema.obj,
          vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            required: true
          }
        }
      ],
      default: []
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', CartSchema);
