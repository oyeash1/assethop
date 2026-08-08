// src/modules/bookings/bookings.model.js
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    listingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Rent par lene wala banda
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Saamaan ka malik
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Pricing Breakdown Snapshots (From our Deposit Engine)
    pricing: {
        baseRent: { type: Number },
        insurancePremium: { type: Number },
        platformFee: { type: Number },
        securityDeposit: { type: Number }
    },
    totals: {
        userTotalPaid: { type: Number },
        hostEarned: { type: Number }
    },

    // New Enterprise Pricing & GST Compliance Fields
    baseRentalFee: { type: Number, required: true },
    userPlatformFee: { type: Number, required: true },
    userGstFee: { type: Number, required: true },
    hostCommissionFee: { type: Number, required: true },
    hostGstFee: { type: Number, required: true },
    hostNetPayout: { type: Number, required: true },
    refundableDeposit: { type: Number, required: true },
    totalUserPayable: { type: Number, required: true },
    totalPlatformProfit: { type: Number, required: true },
    totalGstLiability: { type: Number, required: true },
    razorpayTransferId: { type: String, default: null },

    // State Machine Flow Control
    status: {
        type: String,
        enum: ['PENDING_PAYMENT', 'REQUESTED', 'ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED'],
        default: 'PENDING_PAYMENT'
    },

    // Security Gates (Handover Checkpoints)
    handoverOtp: { type: String, required: true },
    returnOtp: { type: String, required: true },

    // Tracking & Verification Flow (New fields for sequential flow & Late return engine)
    pickupPhotos: {
        type: [String],
        default: []
    },
    handoverVerifiedAt: {
        type: Date
    },
    actualReturnDate: {
        type: Date
    },
    lateFeeCharge: {
        type: Number,
        default: 0
    },
    lateDurationMs: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);