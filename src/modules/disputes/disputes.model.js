const mongoose = require('mongoose');

const DisputeSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        enum: ['DAMAGE', 'LATE_RETURN', 'ITEM_MISSING', 'OTHER'],
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    evidencePhotos: [{
        type: String
    }],
    claimedAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'],
        default: 'OPEN'
    }
}, { timestamps: true });

module.exports = mongoose.model('Dispute', DisputeSchema);
