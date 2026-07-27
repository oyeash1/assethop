// src/app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const listingsRouter = require('./modules/listings/listings.route');
const authRouter = require('./modules/auth/auth.route');
const bookingsRouter = require('./modules/bookings/bookings.route');
const paymentsRouter = require('./modules/payments/payments.route'); // Import payments
const adminRouter = require('./modules/admin/admin.route');

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Core API Gateways Mount Points
app.use('/api/v1/listings', listingsRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/payments', paymentsRouter); // Mount payments router
app.use('/api/v1/admin', adminRouter); // Mount admin router

app.get('/health', (req, res) => {
    res.status(200).json({ status: "success", message: "AssetHop Core Engine is healthy!" });
});

module.exports = app;