const mongoose = require('mongoose');



const ProductSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      default: '',
      trim: true,
    },

    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be a positive number'],
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      index: true,
      trim: true,
    },

    image: {
      type: String,
      default: null,
    },

    /* ================= FULFILLMENT ================= */
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

    /* ================= FLAGS ================= */
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
      occasion: { type: String, trim: true },
      items: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
          },
          quantity: {
            type: Number,
            min: 1,
            default: 1,
          },
        },
      ],
    },

    /* ================= MARKETPLACE ================= */
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
      index: true,
    },

    /* ================= STATUS ================= */
    inStock: {
      type: Boolean,
      default: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

/* ======================================================
   INDEXES
====================================================== */

ProductSchema.index({ name: 'text', category: 'text' });
ProductSchema.index({ vendor: 1, isActive: 1 });
ProductSchema.index({ fulfillmentModel: 1, inStock: 1 });

/* ======================================================
   HELPERS
====================================================== */

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ======================================================
   PRE-SAVE HOOK
   (MONGOOSE 8+ SAFE — PROMISE STYLE)
====================================================== */

ProductSchema.pre('save', async function () {
  /* ========== SLUG ========== */
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name);
  }

  /* ========== EXPRESS RULES ========== */
  if (this.fulfillmentModel === 'EXPRESS') {
    this.deliveryPromise = { minMinutes: 12, maxMinutes: 20 };

    if (this.flags?.liveAnimal) {
      throw new Error('Live animals cannot be EXPRESS products');
    }
  }

  /* ========== MARKETPLACE RULES ========== */
  if (this.fulfillmentModel === 'MARKETPLACE') {
    if (!this.vendor) {
      throw new Error('Marketplace product must have a vendor');
    }

    if (!this.deliveryPromise?.minMinutes) {
      this.deliveryPromise = {
        minMinutes: 60,
        maxMinutes: 1440,
      };
    }
  }

  /* ========== KIT RULES ========== */
  if (this.isKit) {
    if (
      !this.kitData ||
      !Array.isArray(this.kitData.items) ||
      this.kitData.items.length === 0
    ) {
      throw new Error('Kit must contain at least one item');
    }

    if (this.fulfillmentModel !== 'EXPRESS') {
      throw new Error('Puja kits must be EXPRESS');
    }
  }
});

module.exports = mongoose.model('Product', ProductSchema);
