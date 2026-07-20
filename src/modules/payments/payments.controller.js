// src/modules/payments/payments.controller.js
const Razorpay = require('razorpay');
const Booking = require('../bookings/bookings.model');
// Force-load env variables right here to ensure keys are populated
require('dotenv').config();

// Safe instance initialization check
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("⚠️ WARNING: Razorpay Keys are missing from environment variables (.env)!");
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_id_to_prevent_crash_until_env_loads',
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentsController {

    // 1. Create Order: Frontend ko payment pop-up dikhane ke liye order_id chahiye hota hai
    async createRazorpayOrder(req, res) {
        try {
            const { bookingId } = req.body;

            const booking = await Booking.findById(bookingId);
            if (!booking) {
                return res.status(404).json({ status: 'error', message: 'Booking contract not found.' });
            }

            // Razorpay humesha paisa PAISE (cents/paise) mein leta hai, Rupee mein nahi.
            // So ₹100 = 10000 paise. Hum total payable amount ko 100 se multiply karenge.
            const amountInPaise = booking.totals.userTotalPaid * 100;

            const options = {
                amount: amountInPaise,
                currency: "INR",
                receipt: `receipt_booking_${booking._id}`,
            };

            // Razorpay API core trigger
            const order = await razorpay.orders.create(options);

            return res.status(200).json({
                status: 'success',
                message: 'Razorpay order instance generated.',
                data: {
                    razorpayOrderId: order.id,
                    amount: order.amount,
                    currency: order.currency
                }
            });
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // 2. Verify Payment: Payment hone ke baad check karna ki user ne fraud toh nahi kiya
    async verifyPaymentSignature(req, res) {
        try {
            const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);

            hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
            const generatedSignature = hmac.digest('hex');

            // Cryptographic security check: Signature valid hai ya nahi
            if (generatedSignature === razorpaySignature) {
                // Payment successful! Booking status update kar sakte hain ab yahan
                await Booking.findByIdAndUpdate(bookingId, { status: 'REQUESTED' });

                return res.status(200).json({
                    status: 'success',
                    message: 'Payment verified successfully! AssetHop booking confirmed.'
                });
            } else {
                return res.status(400).json({ status: 'error', message: 'Payment verification failed. Signature mismatch.' });
            }
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }
}

module.exports = new PaymentsController();