// src/modules/listings/listings.controller.js
const listingsService = require('./listings.service');
const User = require('../auth/user.model');

class ListingsController {

    // 1. Host side se naya product add karne ke liye
    async addListing(req, res) {
        try {
            const { title, description, category, mrp, dailyRent, coordinates, hostId, images } = req.body;

            // Enforce KYC verification
            const hostUser = await User.findById(req.user.id);
            if (!hostUser || hostUser.kycStatus !== 'VERIFIED') {
                return res.status(403).json({ status: 'error', message: 'KYC verification is required to list products.' });
            }

            // Validation check (Basic validation, formal validator standalone middleware mein banayenge)
            if (!title || !category || !mrp || !dailyRent || !coordinates || !hostId) {
                return res.status(400).json({ status: 'error', message: 'Missing required product fields.' });
            }

            // GeoJSON structure prepare karna [longitude, latitude]
            const listingData = {
                hostId,
                title,
                description,
                category,
                mrp,
                dailyRent,
                images: images || [],
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])]
                }
            };

            const product = await listingsService.createListing(listingData);

            return res.status(201).json({
                status: 'success',
                message: 'Product listed successfully on AssetHop!',
                data: product
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // 2. User side se nearby locations filter karne ke liye
    async getNearbyListings(req, res) {
        try {
            const { lng, lat, radius } = req.query;

            if (!lng || !lat) {
                return res.status(400).json({ status: 'error', message: 'Longitude (lng) and Latitude (lat) are required.' });
            }

            // Default radius 5km (5000 meters) agar user ne pass nahi kiya toh
            const maxDistance = radius ? parseInt(radius) : 5000;

            const products = await listingsService.findNearbyListings(lng, lat, maxDistance);

            return res.status(200).json({
                status: 'success',
                results: products.length,
                data: products
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // 3. Get single product by its database ID
    async getListingById(req, res) {
        try {
            const { id } = req.params;
            const product = await listingsService.findListingById(id);
            if (!product) {
                return res.status(404).json({ status: 'error', message: 'Product listing not found.' });
            }
            return res.status(200).json({
                status: 'success',
                data: product
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // 4. Get listings added by host
    async getMyListings(req, res) {
        try {
            const hostId = req.user.id;
            const products = await listingsService.findListingsByHostId(hostId);
            return res.status(200).json({
                status: 'success',
                data: products
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // 5. Update listing
    async updateListing(req, res) {
        try {
            const { id } = req.params;
            const hostId = req.user.id;
            const role = req.user.role;
            const { title, description, category, mrp, dailyRent, coordinates, status, images } = req.body;

            const updatedListing = await listingsService.updateListing(id, hostId, role, {
                title,
                description,
                category,
                mrp,
                dailyRent,
                coordinates,
                status,
                images
            });

            if (!updatedListing) {
                return res.status(404).json({ status: 'error', message: 'Listing not found.' });
            }

            return res.status(200).json({
                status: 'success',
                message: 'Listing updated successfully!',
                data: updatedListing
            });
        } catch (error) {
            const statusCode = error.message.includes('Unauthorized') ? 403 : 400;
            return res.status(statusCode).json({ status: 'error', message: error.message });
        }
    }

    // 6. Delete listing
    async deleteListing(req, res) {
        try {
            const { id } = req.params;
            const hostId = req.user.id;
            const role = req.user.role;

            const deleted = await listingsService.deleteListing(id, hostId, role);
            if (!deleted) {
                return res.status(404).json({ status: 'error', message: 'Listing not found.' });
            }

            return res.status(200).json({
                status: 'success',
                message: 'Listing deleted successfully!'
            });
        } catch (error) {
            const statusCode = error.message.includes('Unauthorized') ? 403 : 400;
            return res.status(statusCode).json({ status: 'error', message: error.message });
        }
    }

    // 7. Upload listing image to Cloudinary (with fallback uploader)
    async uploadImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
            }

            const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

            if (isCloudinaryConfigured) {
                const cloudinary = require('../../config/cloudinary');
                const { Readable } = require('stream');

                const streamUpload = (fileBuffer) => {
                    return new Promise((resolve, reject) => {
                        const stream = cloudinary.uploader.upload_stream(
                            { folder: 'assethop' },
                            (error, result) => {
                                if (result) resolve(result);
                                else reject(error);
                            }
                        );
                        Readable.from(fileBuffer).pipe(stream);
                    });
                };

                const result = await streamUpload(req.file.buffer);
                return res.status(200).json({
                    status: 'success',
                    message: 'Image uploaded to Cloudinary successfully!',
                    url: result.secure_url
                });
            } else {
                console.warn('⚠️ Cloudinary is not configured. Falling back to base64 preview.');
                const base64Data = req.file.buffer.toString('base64');
                const mockUrl = `data:${req.file.mimetype};base64,${base64Data}`;

                return res.status(200).json({
                    status: 'success',
                    message: 'Image processed (Mock base64 fallback)!',
                    url: mockUrl
                });
            }
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }
}

module.exports = new ListingsController();