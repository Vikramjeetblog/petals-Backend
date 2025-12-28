const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    type: {
      type: String,
      enum: ['EXPRESS', 'MARKETPLACE'],
      required: true
    },

    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },

    items: [OrderItemSchema],

    totalAmount: { type: Number, required: true },

    paymentStatus: {
      type: String,
      enum: ['PAID', 'COD', 'PENDING'],
      default: 'PENDING'
    },

    status: {
      type: String,
      enum: ['PLACED', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      default: 'PLACED'
    },

    paymentGroupId: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
