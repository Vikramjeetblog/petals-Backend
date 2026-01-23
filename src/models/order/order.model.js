const mongoose = require('mongoose');

/*  ORDER ITEM */
const OrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
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
  },
  { _id: false }
);

/*  ORDER  */
const OrderSchema = new mongoose.Schema(
  {
    /*  IDENTIFIERS  */
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    paymentGroupId: {
      type: String,
      required: true,
      index: true,
    },

   
sla: {
  acceptBy: {
    type: Date, // Vendor must accept before this time
    index: true,
  },
  acceptedLate: {
    type: Boolean,
    default: false,
  },
},


    /* ACTORS  */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      index: true,
      default: null,
    },

    /*  ORDER TYPE  */
    type: {
      type: String,
      enum: ['EXPRESS', 'MARKETPLACE'],
      required: true,
      index: true,
    },

    /*  ITEMS  */
    items: {
      type: [OrderItemSchema],
      required: true,
    },

    /* AMOUNTS  */
    totalAmount: {
      type: Number,
      required: true,
    },

    /* PAYMENT  */
    paymentStatus: {
      type: String,
      enum: ['PAID', 'COD', 'PENDING'],
      default: 'PENDING',
      index: true,
    },

    /* ORDER STATUS  */
    status: {
      type: String,
      enum: [
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

    /*  VENDOR TIMESTAMPS  */
    acceptedAt: Date,
    preparedAt: Date,
    readyAt: Date,
    deliveredAt: Date,

    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/*  INDEXES  */
OrderSchema.index({ vendor: 1, status: 1 });
OrderSchema.index({ user: 1, createdAt: -1 });


module.exports = mongoose.model('Order', OrderSchema);
