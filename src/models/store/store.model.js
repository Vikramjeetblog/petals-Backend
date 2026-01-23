const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },
  { timestamps: true }
);

// Geo index
StoreSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Store', StoreSchema);
