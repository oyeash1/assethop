// src/modules/bookings/bookings.route.js
const express = require('express');
const router = express.Router();
const bookingsController = require('./bookings.controller');
const authenticateUser = require('../../middlewares/authenticateUser');

// Dono endpoints completely protected aur isolated rahenge authenticated users ke liye
router.post('/request', authenticateUser, bookingsController.requestRent);
router.post('/cancel-pending', authenticateUser, bookingsController.cancelPendingBooking);
router.post('/verify-handover', authenticateUser, bookingsController.confirmHandover);
router.get('/my-rentals', authenticateUser, bookingsController.getMyRentals);
router.get('/host-requests', authenticateUser, bookingsController.getHostRequests);

module.exports = router;