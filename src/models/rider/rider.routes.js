
 const express = require('express');
 const router = express.Router();
 
 const authMiddleware = require('../middleware/auth.middleware');
 const riderOnly = require('../middleware/riderOnly.middleware');
 const {
  requestOtp,
  verifyOtp,
  me,
  logout,
   getProfile,
  updateProfile,
   updateLocation,
   updateAvailability,
   updateSensitiveInfo,
   getSensitiveInfo,
  getOrders,
  getOrderById,
  verifyPickupOtp,
  updateOrderStatus,
  verifyDeliveryOtp,
  addDeliveryProof,
  getEarningsSummary,
 getEarningsActivity,
 getWallet,
  getPayouts,
  withdrawPayout,
  getBankAccounts,
  addBankAccount,
  deleteBankAccount,
  getKycStatus,
  uploadKycDocuments,
  uploadKycSelfie,
  getOnboardingChecklist,
  completeOnboardingTask,
  getNotifications,
  markNotificationRead,
  getNotificationById,
 createSupportIssue,
  getSafetyTraining,
 } = require('./rider.controller');
 
router.post('/auth/request-otp', requestOtp);
router.post('/auth/verify-otp', verifyOtp);
router.post('/auth/logout', authMiddleware, riderOnly, logout);
router.get('/auth/me', authMiddleware, riderOnly, me);

 router.get('/profile', authMiddleware, riderOnly, getProfile);
router.patch('/profile', authMiddleware, riderOnly, updateProfile);
 router.post('/location', authMiddleware, riderOnly, updateLocation);
 router.patch('/availability', authMiddleware, riderOnly, updateAvailability);
 router.get('/sensitive-info', authMiddleware, riderOnly, getSensitiveInfo);
 router.patch('/sensitive-info', authMiddleware, riderOnly, updateSensitiveInfo);
 
router.get('/orders', authMiddleware, riderOnly, getOrders);
router.get('/orders/:orderId', authMiddleware, riderOnly, getOrderById);
router.post('/orders/:orderId/pickup/verify-otp', authMiddleware, riderOnly, verifyPickupOtp);
router.post('/orders/:orderId/status', authMiddleware, riderOnly, updateOrderStatus);
router.post('/orders/:orderId/delivery/verify-otp', authMiddleware, riderOnly, verifyDeliveryOtp);
router.post('/orders/:orderId/delivery-proof', authMiddleware, riderOnly, addDeliveryProof);

router.get('/earnings/summary', authMiddleware, riderOnly, getEarningsSummary);
router.get('/earnings/activity', authMiddleware, riderOnly, getEarningsActivity);
router.get('/wallet', authMiddleware, riderOnly, getWallet);
router.get('/payouts', authMiddleware, riderOnly, getPayouts);
router.post('/payouts/withdraw', authMiddleware, riderOnly, withdrawPayout);

router.get('/bank-accounts', authMiddleware, riderOnly, getBankAccounts);
router.post('/bank-accounts', authMiddleware, riderOnly, addBankAccount);
router.delete('/bank-accounts/:bankAccountId', authMiddleware, riderOnly, deleteBankAccount);

router.get('/kyc/status', authMiddleware, riderOnly, getKycStatus);
router.post('/kyc/documents', authMiddleware, riderOnly, uploadKycDocuments);
router.post('/kyc/selfie', authMiddleware, riderOnly, uploadKycSelfie);
router.get('/onboarding/checklist', authMiddleware, riderOnly, getOnboardingChecklist);
router.post('/onboarding/checklist/:taskId/complete', authMiddleware, riderOnly, completeOnboardingTask);

router.get('/notifications', authMiddleware, riderOnly, getNotifications);
router.patch('/notifications/:id/read', authMiddleware, riderOnly, markNotificationRead);
router.get('/notifications/:id', authMiddleware, riderOnly, getNotificationById);
router.post('/support/issues', authMiddleware, riderOnly, createSupportIssue);
router.get('/safety/training', authMiddleware, riderOnly, getSafetyTraining);

 module.exports = router;
