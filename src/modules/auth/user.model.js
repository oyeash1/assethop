// src/modules/auth/user.model.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false // Query hit karte waqt password data automatic hide rahega
    },
    role: {
        type: String,
        enum: ['USER', 'HOST', 'SUPER_ADMIN'],
        default: 'USER'
    },
    kycStatus: {
        type: String,
        enum: ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'],
        default: 'NOT_SUBMITTED'
    },
    kycDetails: {
        aadharNumber: { type: String, default: '' },
        aadharFile: { type: String, default: '' },
        panNumber: { type: String, default: '' },
        panFile: { type: String, default: '' },
        otherDocType: { type: String, default: '' },
        otherDocNumber: { type: String, default: '' },
        otherDocFile: { type: String, default: '' },
        submittedAt: { type: Date }
    },
    cibilScore: {
        type: Number,
        default: 750 // For our automatic deposit engine calculations
    },
    cibilTrustScore: {
        type: Number,
        default: 700
    },
    profileImage: {
        type: String,
        default: ''
    },
    payoutDetails: {
        accountHolderName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        upiId: { type: String, default: '' },
        razorpayAccountId: { type: String, default: null },
        isPayoutConfigured: { type: Boolean, default: false }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);