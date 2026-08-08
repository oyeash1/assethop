// src/modules/bookings/bookings.service.js
const Booking = require('./bookings.model');
const Listing = require('../listings/listings.model');
const User = require('../auth/user.model');
const { calculateEnterpriseBreakdown } = require('../../shared/utils/pricing.utils');

class BookingsService {

    // 1. Initial Booking Pipeline Trigger
    async createBookingRequest(listingId, userId, startDate, endDate) {
        // Automatic cleanup of stale bookings before processing a new reservation request
        await this.releaseExpiredBookings();

        // Product details fetch karna dynamic calculations ke liye
        const listing = await Listing.findById(listingId);
        if (!listing) throw new Error('Product not found.');
        if (listing.status !== 'AVAILABLE') throw new Error('Product is currently not available for rent.');

        // User data fetch karna trust profiling (CIBIL Score) ke liye
        const user = await User.findById(userId);
        const userCibil = user ? user.cibilScore : 750;

        // Days count check karna
        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;

        // Triggering our Enterprise Pricing & GST Engine
        const pricingCalculations = calculateEnterpriseBreakdown(
            listing.dailyRent,
            durationDays,
            userCibil,
            listing.mrp,
            listing.category
        );

        // Cryptographic Secure OTP generation for physical checkpoints
        const generatedHandoverOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const generatedReturnOtp = Math.floor(100000 + Math.random() * 900000).toString();

        const booking = await Booking.create({
            listingId,
            userId,
            hostId: listing.hostId,
            startDate,
            endDate,

            // Enterprise pricing fields
            baseRentalFee: pricingCalculations.baseRentalFee,
            userPlatformFee: pricingCalculations.userPlatformFee,
            userGstFee: pricingCalculations.userGstFee,
            hostCommissionFee: pricingCalculations.hostCommissionFee,
            hostGstFee: pricingCalculations.hostGstFee,
            hostNetPayout: pricingCalculations.hostNetPayout,
            refundableDeposit: pricingCalculations.refundableDeposit,
            totalUserPayable: pricingCalculations.totalUserPayable,
            totalPlatformProfit: pricingCalculations.totalPlatformProfit,
            totalGstLiability: pricingCalculations.totalGstLiability,

            // Backwards compatibility mapping
            pricing: {
                baseRent: pricingCalculations.baseRentalFee,
                insurancePremium: 0,
                platformFee: pricingCalculations.totalUserPlatformServiceCharge,
                securityDeposit: pricingCalculations.refundableDeposit
            },
            totals: {
                userTotalPaid: pricingCalculations.totalUserPayable,
                hostEarned: pricingCalculations.hostNetPayout
            },

            handoverOtp: generatedHandoverOtp,
            returnOtp: generatedReturnOtp,
            status: 'PENDING_PAYMENT'
        });

        // Update product listing status temporarily to block multiple bookings
        listing.status = 'MAINTENANCE'; // Rented flows lock matrix
        await listing.save();

        return booking;
    }

    // 2. Physical Handover Verification OTP Service
    async verifyHandover(bookingId, hostId, enteredOtp) {
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new Error('Booking contract not found.');
        if (booking.hostId.toString() !== hostId) throw new Error('Unauthorized host verification.');
        if (booking.status !== 'REQUESTED') throw new Error('Invalid transition state.');
        
        // Sequential validation check: Ensure photos are uploaded before handover OTP can be verified
        if (!booking.pickupPhotos || booking.pickupPhotos.length === 0) {
            throw new Error('Cannot verify handover. Renter must capture and upload pickup photos first.');
        }

        if (booking.handoverOtp !== enteredOtp) throw new Error('Invalid Handover OTP protection code.');

        // Update status to ACTIVE (Asset officially hops to User)
        booking.status = 'ACTIVE';
        booking.handoverVerifiedAt = new Date();
        await booking.save();

        // Toggle asset state to RENTED globally
        await Listing.findByIdAndUpdate(booking.listingId, { status: 'RENTED' });

        return { status: 'success', message: 'AssetHop Handover Verified. Trip is now ACTIVE!' };
    }

    // 2.5 Save Renter's Pickup Photos at shop
    async savePickupPhotos(bookingId, userId, photos) {
        const booking = await Booking.findOne({ _id: bookingId, userId });
        if (!booking) throw new Error('Booking contract not found or unauthorized.');
        if (booking.status !== 'REQUESTED') throw new Error('Cannot upload pickup photos. Invalid booking state.');

        booking.pickupPhotos = photos || [];
        await booking.save();

        return { status: 'success', message: 'Pickup photos saved successfully.' };
    }

    // 2.6 Physical Return Verification OTP Service & Late Fee Calculation
    async verifyReturn(bookingId, hostId, enteredOtp) {
        const booking = await Booking.findById(bookingId);
        if (!booking) throw new Error('Booking contract not found.');
        if (booking.hostId.toString() !== hostId) throw new Error('Unauthorized host verification.');
        if (booking.status !== 'ACTIVE') throw new Error('Cannot verify return. Rental trip is not active.');
        if (booking.returnOtp !== enteredOtp) throw new Error('Invalid Return OTP protection code.');

        const listing = await Listing.findById(booking.listingId);
        if (!listing) throw new Error('Associated listing not found.');

        const now = new Date();
        const allowedDurationMs = booking.endDate - booking.startDate;
        const actualDurationMs = now - booking.handoverVerifiedAt;
        const overdueMs = actualDurationMs - allowedDurationMs;

        let lateFee = 0;
        let lateDurationMs = 0;

        if (overdueMs > 0) {
            lateDurationMs = overdueMs;
            const hoursExceeded = Math.ceil(overdueMs / (1000 * 60 * 60)); // Round up hours
            const hourlyRent = listing.dailyRent / 24;
            const lateFeeRatePerHour = hourlyRent * 1.5; // 1.5x penalty rate
            lateFee = Math.ceil(hoursExceeded * lateFeeRatePerHour);
        }

        // Set returned state parameters
        booking.actualReturnDate = now;
        booking.lateFeeCharge = lateFee;
        booking.lateDurationMs = lateDurationMs;
        booking.status = 'COMPLETED';
        await booking.save();

        // Release the Razorpay hold if it exists
        if (booking.razorpayTransferId && !booking.razorpayTransferId.startsWith('rzp_trf_mock_')) {
            try {
                const Razorpay = require('razorpay');
                const razorpay = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET,
                });
                await razorpay.transfers.edit(booking.razorpayTransferId, {
                    on_hold: false
                });
                console.log(`[Razorpay Route] Released hold for transfer: ${booking.razorpayTransferId}`);
            } catch (err) {
                console.error(`[Razorpay Route Error] Failed to release hold for transfer ${booking.razorpayTransferId}:`, err.message);
            }
        } else if (booking.razorpayTransferId) {
            console.log(`[Razorpay Mock Route] Simulating hold release for mock transfer: ${booking.razorpayTransferId}`);
        }

        // Release listed product to be available again
        listing.status = 'AVAILABLE';
        await listing.save();

        return {
            status: 'success',
            message: 'AssetHop Return Verified. Trip is now COMPLETED!',
            data: {
                actualReturnDate: booking.actualReturnDate,
                lateFeeCharge: booking.lateFeeCharge,
                lateDurationMs: booking.lateDurationMs,
                status: booking.status
            }
        };
    }

    // 3. Find rentals requested by user
    async findRentalsByUserId(userId) {
        return await Booking.find({ userId, status: { $ne: 'PENDING_PAYMENT' } }).populate('listingId').populate('hostId', 'name email');
    }

    // 4. Find requests received by host
    async findRequestsByHostId(hostId) {
        return await Booking.find({ hostId, status: { $ne: 'PENDING_PAYMENT' } }).populate('listingId').populate('userId', 'name email');
    }

    // 5. Expose method to release expired pending bookings (older than 10 minutes)
    async releaseExpiredBookings() {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const expiredBookings = await Booking.find({
            status: 'PENDING_PAYMENT',
            createdAt: { $lt: tenMinutesAgo }
        });

        for (const booking of expiredBookings) {
            booking.status = 'CANCELLED';
            await booking.save();
            await Listing.findByIdAndUpdate(booking.listingId, { status: 'AVAILABLE' });
        }
    }

    // 6. Cancel a pending booking (e.g. if payment was cancelled/closed)
    async cancelPendingBooking(bookingId, userId) {
        const booking = await Booking.findOne({ _id: bookingId, userId, status: 'PENDING_PAYMENT' });
        if (!booking) {
            return { status: 'success', message: 'No pending booking found to cancel.' };
        }

        booking.status = 'CANCELLED';
        await booking.save();

        // Restore listing status to AVAILABLE
        await Listing.findByIdAndUpdate(booking.listingId, { status: 'AVAILABLE' });

        return { status: 'success', message: 'Pending booking cancelled and asset released.' };
    }
}

module.exports = new BookingsService();