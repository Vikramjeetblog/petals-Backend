const mongoose = require('mongoose');

const RiderOrderSchema = new mongoose.Schema(
  {
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rider',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['assigned', 'picked', 'enroute', 'arrived', 'delivered'],
      default: 'assigned',
      index: true,
    },
    pickup: {
      address: String,
      lat: Number,
      lng: Number,
    },
    drop: {
      address: String,
      lat: Number,
      lng: Number,
    },
    eta: String,
     estimatedDistance: { type: Number, default: null },
    estimatedDuration: { type: Number, default: null },
    alert: {
      type: String,
      enum: ['LIVE', 'FRAGILE', null],
      default: null,
    },
    items: [
      {
        name: String,
        qty: Number,
      },
    ],
    customer: {
      name: String,
      phone: String,
    },
    earning: {
      type: Number,
      default: 0,
    },
    pickupOtp: {
      type: String,
      default: '1234',
    },
    deliveryOtp: {
      type: String,
      default: '1234',
    },
    deliveryProof: {
      photoUrl: String,
      notes: String,
      uploadedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RiderOrder', RiderOrderSchema);
