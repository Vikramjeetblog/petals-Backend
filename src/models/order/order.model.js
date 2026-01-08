const mongoose = require('mongoose');

/* ================= ORDER ITEM ================= */
const OrderItemSchema = new mongoose.Schema(
  {
    /* PRODUCT REFERENCE */
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    /* QUANTITY */
    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    /* PRICE SNAPSHOT */
    price: {
      type: Number,
      required: true,
      immutable: true
    },

    /* FULFILLMENT */
    fulfillmentModel: {
      type: String,
      enum: ['EXPRESS', 'MARKETPLACE'],
      required: true
    },

    /* VENDOR (MARKETPLACE ONLY) */
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null
    },

    /* ================= KIT SUPPORT ================= */
    isKit: {
      type: Boolean,
      default: false
    },

    kitItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        },
        quantity: {
          type: Number,
          default: 1
        }
      }
    ]
  },
  { _id: false }
);

/* ================= ORDER ================= */
const OrderSchema = new mongoose.Schema(
  {
    /* USER */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    /* ITEMS */
    items: {
      type: [OrderItemSchema],
      required: true
    },

    /* TOTALS */
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

    /* STATUS */
    status: {
      type: String,
      enum: ['PLACED', 'ACCEPTED'],
      default: 'ACCEPTED'
    },

    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PAID'
    },

    /* SPLIT ORDER */
    splitRequired: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
