const mongoose = require('mongoose');

const SensitiveInfoSchema = new mongoose.Schema({
   bankAccountNumber:{
       type: String,
       select: false,
       default: null,
     },
     bankIfscCode: {
       type: String,
       select: false,
       default: null,
     },
   },
   { _id: false }
 );
 
 const RiderSchema = new mongoose.Schema(
   {
     phone: {
       type: String,
       required: true,
       unique: true,
       index: true,
     },
     name: {
       type: String,
       default: 'New Rider',
     },
   email: {
     type: String,
     default: null,
      trim: true,
     lowercase: true,
   },
   vehicleType: {
     type: String,
     default: null,
   },
   vehicleNumber: {
     type: String,
     default: null,
    },
    rating: {
      type: Number,
      default: 5,
    },
   kycStatus: {
      type: String,
     enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
   onboardingStatus: {
      type: String,
      enum: ['INCOMPLETE', 'COMPLETED'],
     default: 'INCOMPLETE',
   },
   wallet: {
      available: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
    },
    bankAccounts: [
      {
       bankName: String,
        accountHolderName: String,
        accountNumber: String,
       ifscCode: String,
       isPrimary: { type: Boolean, default: false },
      },
   ],
   payouts: [
      {
        amount: Number,
        status: { type: String, default: 'PENDING' },
       date: { type: Date, default: Date.now },
       bankAccountId: String,
      },
    ],
   notifications: [
     {
       title: String,
       message: String,
        type: String,
       read: { type: Boolean, default: false },
       createdAt: { type: Date, default: Date.now },
     },
   ],
    onboardingChecklist: [
     {
       taskId: String,
       label: String,
        completed: { type: Boolean, default: false },
      },
    ],
    kyc: {
     timeline: [
       {
         status: {
           type: String,
           enum: ['PENDING', 'VERIFIED', 'REJECTED'],
         },
         note: String,
          at: { type: Date, default: Date.now },
       },
      ],
      documents: [
       {
         type: String,
          fileUrl: String,
          uploadedAt: { type: Date, default: Date.now },
       },
      ],
     selfieUrl: String,
   },
     isOnline: {
       type: Boolean,
       default: false,
     },
     isAvailable: {
       type: Boolean,
       default: true,
     },
     lastLocation: {
       type: {
         type: String,
         enum: ['Point'],
         default: 'Point',
       },
       coordinates: {
         type: [Number],
         default: [0, 0],
       },
     },
    sensitiveInfo: {
       type: SensitiveInfoSchema,
       default: () => ({}),
       select: false,
     },
   },
   {
     timestamps: true,
   }
);


RiderSchema.index({ lastLocation: "2dsphere" });

module.exports = mongoose.model("Rider", RiderSchema);
