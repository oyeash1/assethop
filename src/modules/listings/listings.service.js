// src/modules/listings/listings.service.js
const Listing = require('./listings.model');
const bookingsService = require('../bookings/bookings.service');

class ListingsService {

    // 1. New Product List Karne Ka Engine
    async createListing(listingData) {
        const newListing = await Listing.create(listingData);
        return newListing;
    }

    // 2. Hyperlocal Search Engine Query ($geoNear API Component)
    async findNearbyListings(lng, lat, maxDistanceInMeters = 5000) {
        await bookingsService.releaseExpiredBookings();
        return await Listing.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    distanceField: "distanceInMeters", // Dynamic property created on runtime
                    maxDistance: parseFloat(maxDistanceInMeters),
                    spherical: true,
                    query: { status: 'AVAILABLE' } // Sirf wo saamaan dikhe jo khali pada ho
                }
            }
        ]);
    }

    // 3. Find single listing by id
    async findListingById(id) {
        await bookingsService.releaseExpiredBookings();
        return await Listing.findById(id).populate('hostId', 'name email profileImage');
    }

    // 4. Find all listings by host
    async findListingsByHostId(hostId) {
        await bookingsService.releaseExpiredBookings();
        return await Listing.find({ hostId });
    }

    // 5. Update listed product (Host or SUPER_ADMIN only)
    async updateListing(id, hostId, role, updateData) {
        const listing = await Listing.findById(id);
        if (!listing) return null;

        // Auth check
        if (listing.hostId.toString() !== hostId.toString() && role !== 'SUPER_ADMIN') {
            throw new Error('Unauthorized to update this listing.');
        }

        // Apply changes
        if (updateData.title !== undefined) listing.title = updateData.title;
        if (updateData.description !== undefined) listing.description = updateData.description;
        if (updateData.category !== undefined) listing.category = updateData.category;
        if (updateData.mrp !== undefined) listing.mrp = updateData.mrp;
        if (updateData.dailyRent !== undefined) listing.dailyRent = updateData.dailyRent;
        if (updateData.status !== undefined) listing.status = updateData.status;
        if (updateData.images !== undefined) listing.images = updateData.images;
        if (updateData.coordinates !== undefined) {
            listing.location = {
                type: 'Point',
                coordinates: [parseFloat(updateData.coordinates[0]), parseFloat(updateData.coordinates[1])]
            };
        }

        await listing.save();
        return listing;
    }

    // 6. Delete listed product (Host or SUPER_ADMIN only)
    async deleteListing(id, hostId, role) {
        const listing = await Listing.findById(id);
        if (!listing) return null;

        // Auth check
        if (listing.hostId.toString() !== hostId.toString() && role !== 'SUPER_ADMIN') {
            throw new Error('Unauthorized to delete this listing.');
        }

        // Double check active bookings to prevent orphaned bookings or inconsistencies
        const Booking = require('../bookings/bookings.model');
        const activeBooking = await Booking.findOne({
            listingId: id,
            status: { $in: ['PENDING_PAYMENT', 'REQUESTED', 'ACTIVE', 'DISPUTED'] }
        });

        if (activeBooking) {
            throw new Error('Cannot delete listing because it has active or pending bookings.');
        }

        await Listing.findByIdAndDelete(id);
        return true;
    }
}

module.exports = new ListingsService();