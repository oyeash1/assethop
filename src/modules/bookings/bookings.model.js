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
        baseRent: { type: Number, required: true },
        insurancePremium: { type: Number, required: true },
        platformFee: { type: Number, required: true },
        securityDeposit: { type: Number, required: true }
    },
    totals: {
        userTotalPaid: { type: Number, required: true },
        hostEarned: { type: Number, required: true }
    },

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