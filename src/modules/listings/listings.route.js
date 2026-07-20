// src/modules/listings/listings.route.js
const express = require('express');
const router = express.Router();
const listingsController = require('./listings.controller');

// Import Gatekeeper Middlewares
const authenticateUser = require('../../middlewares/authenticateUser');
const requireRole = require('../../middlewares/requireRole');

// Route: Open to public (Koi bhi bina login kiye nearby products dekh sakta hai)
router.get('/nearby', listingsController.getNearbyListings);
router.get('/my/all', authenticateUser, listingsController.getMyListings);
router.get('/:id', listingsController.getListingById);

const upload = require('../../middlewares/upload.middleware');

// Route: SECURED (Sirf logged-in insaan jiska role HOST ho, wahi saamaan list kar payega)
router.post('/add', authenticateUser, requireRole('HOST', 'SUPER_ADMIN'), listingsController.addListing);
router.put('/:id', authenticateUser, requireRole('HOST', 'SUPER_ADMIN'), listingsController.updateListing);
router.delete('/:id', authenticateUser, requireRole('HOST', 'SUPER_ADMIN'), listingsController.deleteListing);
router.post('/upload', authenticateUser, upload.single('image'), listingsController.uploadImage);

module.exports = router;