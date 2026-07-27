// src/modules/admin/admin.route.js
const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const authenticateUser = require('../../middlewares/authenticateUser');
const requireRole = require('../../middlewares/requireRole');

// Restrict all routes in this router to authenticated SUPER_ADMINs
router.use(authenticateUser);
router.use(requireRole('SUPER_ADMIN'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getAllUsers);
router.get('/kyc/pending', adminController.getPendingKyc);
router.post('/kyc/review', adminController.reviewKyc);

module.exports = router;
