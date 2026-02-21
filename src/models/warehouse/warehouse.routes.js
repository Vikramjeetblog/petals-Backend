const express = require('express');
const auth = require('../middleware/auth.middleware');
const { getPickList } = require('./warehouse.controller');

const router = express.Router();

router.get('/pick-list', auth, getPickList);

module.exports = router;
