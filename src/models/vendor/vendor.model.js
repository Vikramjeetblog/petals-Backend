const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema(
  {
    /* ================= AUTH ================= */
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    role: {
      type: String,
      default: 'VENDOR',
      immutable: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    onboardingStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'APPROVED',
      index: true,
    },

    /* ================= BASIC INFO ================= */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    /* ================= STORE INFO ================= */
    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    storeImage: String,

    categories: {
      type: [String],
      index: true,
    },

    description: String,

    /* ================= LOCATION ================= */
    location: {
      address: String,
      city: String,
      state: String,
      pincode: String,

      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number],
          required: true,
          default: [0, 0],
        },
      },
    },

    /* ================= BUSINESS SETTINGS ================= */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isOnline: {
      type: Boolean,
      default: true,
    },

    autoAcceptOrders: {
      type: Boolean,
      default: true,
    },

    fulfillmentModel: {
      type: String,
      enum: ['MARKETPLACE'],
      default: 'MARKETPLACE',
    },

    /* ================= PAYOUT ================= */
    payout: {
      bankName: String,
      accountNumber: String,
      ifsc: String,
      holderName: String,
    },

    commissionPercent: {
      type: Number,
      default: 15,
    },

    /* ================= STATS ================= */
    stats: {
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

VendorSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Vendor', VendorSchema);

