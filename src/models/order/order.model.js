const mongoose = require('mongoose');

/* ================= ORDER ITEM ================= */
const OrderItemSchema = new mongoose.Schema(
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
    },

    fulfillmentModel: {
      type: String,
      enum: ['EXPRESS', 'MARKETPLACE'],
      required: true
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null
    }
  },
  { _id: false }
);

/* ================= ORDER ================= */
const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    items: {
      type: [OrderItemSchema],
      required: true
    },

    totals: {
      expressTotal: {
        type: Number,
        default: 0
      },
      marketplaceTotal: {
        type: Number,
        default: 0
      },
      grandTotal: {
        type: Number,
        required: true
      }
    },

    status: {
      type: String,
      enum: ['PLACED', 'ACCEPTED'],
      default: 'ACCEPTED' // auto-accept for now
    },

    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PAID' // mock payment for demo
    },

    splitRequired: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
