// src/modules/payments/payments.route.js
const express = require('express');
const router = express.Router();
const paymentsController = require('./payments.controller');
const authenticateUser = require('../../middlewares/authenticateUser');

// Dono routes securely locked rahenge
router.post('/create-order', authenticateUser, paymentsController.createRazorpayOrder);
router.post('/verify', authenticateUser, paymentsController.verifyPaymentSignature);

module.exports = router;