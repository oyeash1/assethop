const mongoose = require('mongoose');

const LedgerSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    renterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    baseRentalFee: {
        type: Number,
        required: true
    },
    userPlatformFee: {
        type: Number,
        required: true
    },
    userGstFee: {
        type: Number,
        required: true
    },
    hostCommissionFee: {
        type: Number,
        required: true
    },
    hostGstFee: {
        type: Number,
        required: true
    },
    hostNetPayout: {
        type: Number,
        required: true
    },
    refundableDeposit: {
        type: Number,
        required: true
    },
    totalUserPayable: {
        type: Number,
        required: true
    },
    razorpayTransferId: {
        type: String,
        default: null
    },
    payoutStatus: {
        type: String,
        enum: ['HELD', 'SETTLED', 'REFUNDED', 'DISPUTED'],
        default: 'HELD'
    }
}, { timestamps: true });

module.exports = mongoose.model('Ledger', LedgerSchema);
