const mongoose = require('mongoose');

const LocationLogSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});

// Spatial index for coordinates
LocationLogSchema.index({ coordinates: '2dsphere' });

// TTL index to expire documents 48 hours (172800 seconds) after createdAt
LocationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

module.exports = mongoose.model('LocationLog', LocationLogSchema);
