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
        enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        default: 'PENDING'
    },
    cibilScore: {
        type: Number,
        default: 750 // For our automatic deposit engine calculations
    },
    profileImage: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);