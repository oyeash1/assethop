// src/modules/bookings/bookings.controller.js
const bookingsService = require('./bookings.service');
const User = require('../auth/user.model');

class BookingsController {

    // Endpoint: User hits "Pay & Rent Now"
    async requestRent(req, res) {
        try {
            const { listingId, startDate, endDate } = req.body;
            const userId = req.user.id; // Coming directly from our secure authenticateUser middleware

            // Enforce KYC verification
            const renterUser = await User.findById(userId);
            if (!renterUser || renterUser.kycStatus !== 'VERIFIED') {
                return res.status(403).json({ status: 'error', message: 'KYC verification is required to rent products.' });
            }

            if (!listingId || !startDate || !endDate) {
                return res.status(400).json({ status: 'error', message: 'Missing core booking details.' });
            }

            const order = await bookingsService.createBookingRequest(listingId, userId, startDate, endDate);
            return res.status(201).json({ status: 'success', data: order });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // Endpoint: Host enters OTP at the shop during physical exchange
    async confirmHandover(req, res) {
        try {
            const { bookingId, otp } = req.body;
            const hostId = req.user.id; // Host security tracking verification

            if (!bookingId || !otp) {
                return res.status(400).json({ status: 'error', message: 'Booking ID and verification OTP required.' });
            }

            const validation = await bookingsService.verifyHandover(bookingId, hostId, otp);
            return res.status(200).json(validation);
        } catch (error) {
            return res.status(400).json({ status: 'error', message: error.message });
        }
    }

    // Get all bookings placed by the logged-in User
    async getMyRentals(req, res) {
        try {
            const userId = req.user.id;
            const rentals = await bookingsService.findRentalsByUserId(userId);
            return res.status(200).json({ status: 'success', data: rentals });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // Get all bookings requested from the logged-in Host
    async getHostRequests(req, res) {
        try {
            const hostId = req.user.id;
            const requests = await bookingsService.findRequestsByHostId(hostId);
            return res.status(200).json({ status: 'success', data: requests });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // Cancel/release a booking in PENDING_PAYMENT status
    async cancelPendingBooking(req, res) {
        try {
            const { bookingId } = req.body;
            const userId = req.user.id;

            if (!bookingId) {
                return res.status(400).json({ status: 'error', message: 'Booking ID is required.' });
            }

            const result = await bookingsService.cancelPendingBooking(bookingId, userId);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }
}

module.exports = new BookingsController();