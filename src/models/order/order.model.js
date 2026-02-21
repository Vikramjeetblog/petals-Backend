const mongoose = require('mongoose');

/* ================= LOGISTICS FLAGS ================= */
const LogisticsFlagsSchema = new mongoose.Schema(
  {
    perishable: {
      type: Boolean,
      default: false,
    },
    fragile: {
      type: Boolean,
      default: false,
    },
    liveAnimal: {
      type: Boolean,
      default: false,
    },
    handleWithCare: {
      type: Boolean,
      default: false,
    },
    logisticsFlag: {
      type: String,
      enum: ['FRAGILE', 'LIVE_ANIMAL', null],
      default: null,
    },
  },
  { _id: false }
);

/* ================= ORDER ITEM ================= */
const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
    },

    logisticsFlags: {
      type: LogisticsFlagsSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

/* ================= SLA ================= */
const SLASchema = new mongoose.Schema(
  {
    acceptBy: {
      type: Date,
      index: true,
    },
    acceptedLate: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

/* ================= ORDER ================= */
const OrderSchema = new mongoose.Schema(
  {
    /* ---------- IDENTIFIERS ---------- */

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    paymentGroupId: {
      type: String,
      required: true,
      index: true,
    },

    parentOrderId: {
      type: String,
      required: true,
      index: true,
    },

    trackingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* ---------- ACTORS ---------- */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      index: true,
      default: null,
    },

    /* ---------- ORDER TYPE ---------- */

    type: {
      type: String,
      enum: ['EXPRESS', 'MARKETPLACE'],
      required: true,
      index: true,
    },

    fulfillmentSource: {
      type: String,
      enum: ['STORE', 'VENDOR'],
      required: true,
      index: true,
    },

    /* ---------- ITEMS ---------- */

    items: {
      type: [OrderItemSchema],
      required: true,
    },

    /* ---------- FINANCIALS ---------- */

    totalAmount: {
      type: Number,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ['PAID', 'COD', 'PENDING'],
      default: 'PENDING',
      index: true,
    },

    /* ---------- STATUS ---------- */

    status: {
      type: String,
      enum: [
        'PENDING_VENDOR_ACCEPTANCE',
        'PLACED',
        'ACCEPTED',
        'REJECTED',
        'PREPARING',
        'READY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'PLACED',
      index: true,
    },

    /* ---------- SLA ---------- */

    sla: {
      type: SLASchema,
      default: () => ({}),
    },

    /* ---------- VENDOR TIMELINE ---------- */

    acceptedAt: Date,
    prepTimeMinutes: Number,
    estimatedReadyAt: Date,
    preparedAt: Date,
    readyAt: Date,
    deliveredAt: Date,

    rejectionReason: {
      type: String,
      trim: true,
    },

    /* ---------- FUTURE READY FLAGS ---------- */

    subscriptionId: {
      type: String,
      default: null,
      index: true,
    },

    riderAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rider',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= PERFORMANCE INDEXES ================= */

// Vendor dashboard
OrderSchema.index({ vendor: 1, status: 1, createdAt: -1 });

// User order history
OrderSchema.index({ user: 1, createdAt: -1 });

// Parent order grouping
OrderSchema.index({ parentOrderId: 1 });

// Payment grouping
OrderSchema.index({ paymentGroupId: 1 });

// SLA expiration scanning
OrderSchema.index({ 'sla.acceptBy': 1, status: 1 });

module.exports = mongoose.model('Order', OrderSchema);
