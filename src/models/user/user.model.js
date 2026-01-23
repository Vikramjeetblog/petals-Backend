const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true
    },

    name: {
      type: String
    },

    assignedStore: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Store',
  default: null
},

    lastLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]   
      }
    }
  },
  {
    timestamps: true
  }
);

// Geo index
UserSchema.index({ lastLocation: '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
