// src/modules/admin/admin.controller.js
const User = require('../auth/user.model');
const Listing = require('../listings/listings.model');
const Booking = require('../bookings/bookings.model');

class AdminController {

    // Fetch dashboard overview statistics
    async getStats(req, res) {
        try {
            const totalUsers = await User.countDocuments();
            const totalListings = await Listing.countDocuments();
            const totalBookings = await Booking.countDocuments();
            const pendingKycCount = await User.countDocuments({ kycStatus: 'PENDING' });
            const activeRentals = await Booking.countDocuments({ status: 'ACTIVE' });

            // Calculate profit and volume from bookings
            // Skip bookings that are in 'PENDING_PAYMENT' or 'CANCELLED' status
            const successfulBookings = await Booking.find({ 
                status: { $nin: ['PENDING_PAYMENT', 'CANCELLED'] } 
            });

            const totalVolume = successfulBookings.reduce((sum, b) => sum + (b.totals?.userTotalPaid || 0), 0);
            const totalProfit = successfulBookings.reduce((sum, b) => sum + (b.pricing?.platformFee || 0), 0);

            return res.status(200).json({
                status: 'success',
                data: {
                    totalUsers,
                    totalListings,
                    totalBookings,
                    pendingKycCount,
                    activeRentals,
                    totalVolume,
                    totalProfit
                }
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // Get all users in the system (with optional filtering and search)
    async getAllUsers(req, res) {
        try {
            const { search, kycStatus, role } = req.query;
            const filter = {};

            if (kycStatus) {
                filter.kycStatus = kycStatus;
            }

            if (role) {
                filter.role = role;
            }

            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { phoneNumber: { $regex: search, $options: 'i' } }
                ];
            }

            const users = await User.find(filter).sort({ createdAt: -1 });

            return res.status(200).json({
                status: 'success',
                results: users.length,
                data: users
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // Get only users with pending KYC status
    async getPendingKyc(req, res) {
        try {
            const pendingUsers = await User.find({ kycStatus: 'PENDING' }).sort({ 'kycDetails.submittedAt': 1 });
            return res.status(200).json({
                status: 'success',
                results: pendingUsers.length,
                data: pendingUsers
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // Approve or Reject KYC request
    async reviewKyc(req, res) {
        try {
            const { userId, action, rejectionReason } = req.body;

            if (!userId || !action) {
                return res.status(400).json({ status: 'error', message: 'User ID and Action (APPROVE or REJECT) are required.' });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ status: 'error', message: 'User not found.' });
            }

            if (action === 'APPROVE') {
                user.kycStatus = 'VERIFIED';
                if (user.kycDetails) {
                    user.kycDetails.rejectionReason = '';
                }
            } else if (action === 'REJECT') {
                user.kycStatus = 'REJECTED';
                if (!rejectionReason) {
                    return res.status(400).json({ status: 'error', message: 'Rejection reason is required when rejecting KYC.' });
                }
                if (user.kycDetails) {
                    user.kycDetails.rejectionReason = rejectionReason;
                }
            } else {
                return res.status(400).json({ status: 'error', message: 'Invalid action. Must be APPROVE or REJECT.' });
            }

            await user.save();

            return res.status(200).json({
                status: 'success',
                message: `KYC request successfully ${action === 'APPROVE' ? 'Approved' : 'Rejected'}.`,
                data: user
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }
}

module.exports = new AdminController();
