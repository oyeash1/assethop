// src/modules/host/host.route.js
const express = require('express');
const router = express.Router();
const { HostController } = require('./host.controller');
const authenticateUser = require('../../middlewares/authenticateUser');

// PUT /api/v1/host/payout-settings
router.put('/payout-settings', authenticateUser, HostController.updatePayoutSettings);

module.exports = router;
