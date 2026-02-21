const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth.middleware');
const riderOnly = require('../middleware/riderOnly.middleware');
const {
  getProfile,
  updateLocation,
  updateAvailability,
  updateSensitiveInfo,
  getSensitiveInfo,
} = require('./rider.contorller');

router.get('/profile', authMiddleware, riderOnly, getProfile);
router.post('/location', authMiddleware, riderOnly, updateLocation);
router.patch('/availability', authMiddleware, riderOnly, updateAvailability);
router.get('/sensitive-info', authMiddleware, riderOnly, getSensitiveInfo);
router.patch('/sensitive-info', authMiddleware, riderOnly, updateSensitiveInfo);

module.exports = router;
