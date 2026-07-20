// scripts/utils/setup-geo-indexes.js
const mongoose = require('mongoose');
const Listing = require('../../src/modules/listings/listings.model');
require('dotenv').config();

const setupIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('💾 Connected to MongoDB for indexing tasks...');

        // Ensure 2dsphere index is built perfectly
        await Listing.syncIndexes();
        console.log('✅ Geo-spatial 2dsphere indexing successfully synchronized!');

        process.exit(0);
    } catch (error) {
        console.error(`❌ Indexing failed: ${error.message}`);
        process.exit(1);
    }
};

setupIndexes();