const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR'],
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Otp', OtpSchema);
