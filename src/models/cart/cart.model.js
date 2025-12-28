

const mongoose = require('mongoose');

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
      required: true
    }
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    /**
     * Cart belongs to one user
     */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    /**
     * Assigned dark store
     * Used only for EXPRESS items
     */
    assignedStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null
    },
    expressItems: [CartItemSchema],

  
    marketplaceItems: [
      {
        ...CartItemSchema.obj,

    
        vendor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vendor',
          required: true
        }
      }
    ],

  
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Cart', CartSchema);
