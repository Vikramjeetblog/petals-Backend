const express = require('express');
const router = express.Router();



const authMiddleware = require('../middleware/auth.middleware');
const { getProfile,updateLocation } = require('./user.controller');

router.get('/profile', authMiddleware, getProfile);
router.post('/location', authMiddleware, updateLocation)
module.exports = router;
