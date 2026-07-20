// src/modules/listings/listings.model.js
const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['ELECTRONICS', 'VEHICLES', 'LIFESTYLE'] // Humare Engine se matching categories
    },
    mrp: {
        type: Number,
        required: true // Dynamic deposit calculate karne ke liye zaroori hai
    },
    dailyRent: {
        type: Number,
        required: true
    },
    images: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['AVAILABLE', 'RENTED', 'MAINTENANCE'],
        default: 'AVAILABLE'
    },
    // Hyperlocal Search Engine Component
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude] -> Dhyan dena, MongoDB mein Longitude PEHLE aata hai
            required: true
        }
    }
}, { timestamps: true });

// Core Requirement: Spatial Query run karne ke liye 2dsphere index banana zaroori hai
ListingSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Listing', ListingSchema);