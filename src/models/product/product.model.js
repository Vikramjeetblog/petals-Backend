const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    /* ================= FULFILLMENT (CORE) ================= */
    fulfillmentModel: {
      type: String,
      enum: ['EXPRESS', 'MARKETPLACE'],
      required: true,
      index: true,
    },

    deliveryPromise: {
      minMinutes: { type: Number },
      maxMinutes: { type: Number },
    },

    flags: {
      perishable: { type: Boolean, default: false },
      fragile: { type: Boolean, default: false },
      liveAnimal: { type: Boolean, default: false },
    },

    /* ================= KIT BUILDER ================= */
    isKit: {
      type: Boolean,
      default: false,
    },

    kitData: {
      occasion: { type: String }, // e.g. Laxmi Puja
      items: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
          },
          quantity: {
            type: Number,
            default: 1,
          },
        },
      ],
    },

    /* ================= MARKETPLACE ================= */
    // only for MARKETPLACE products
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },

    /* ================= STATUS ================= */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ProductSchema.pre('save', function (next) {
  /* EXPRESS RULES */
  if (this.fulfillmentModel === 'EXPRESS') {
    this.deliveryPromise = { minMinutes: 12, maxMinutes: 20 };

    if (this.flags.liveAnimal) {
      return next(
        new Error('Live animals cannot be EXPRESS products')
      );
    }
  }

  /* MARKETPLACE RULES */
  if (this.fulfillmentModel === 'MARKETPLACE') {
    if (!this.vendor) {
      return next(
        new Error('Marketplace product must have a vendor')
      );
    }

    if (!this.deliveryPromise?.minMinutes) {
      this.deliveryPromise = {
        minMinutes: 60,
        maxMinutes: 1440,
      };
    }
  }

  /* KIT RULES */
  if (this.isKit) {
    if (
      !this.kitData ||
      !this.kitData.items ||
      this.kitData.items.length === 0
    ) {
      return next(
        new Error('Kit must contain at least one item')
      );
    }

    if (this.fulfillmentModel !== 'EXPRESS') {
      return next(
        new Error('Puja kits must be EXPRESS')
      );
    }
  }

  next();
});


module.exports = mongoose.model('Product', ProductSchema);
