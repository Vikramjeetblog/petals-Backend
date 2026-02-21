const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    frequency: {
      type: String,
      enum: ['MONTHLY', 'YEARLY'],
      required: true,
    },
    nextDeliveryDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    razorpaySubscriptionId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ user: 1, status: 1, nextDeliveryDate: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
