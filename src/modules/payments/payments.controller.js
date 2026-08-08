// src/modules/payments/payments.controller.js
const paymentsService = require('./payments.service');

class PaymentsController {

    // 1. Create Order: Frontend ko payment pop-up dikhane ke liye order_id chahiye hota hai
    async createRazorpayOrder(req, res) {
        try {
            const { bookingId } = req.body;
            const order = await paymentsService.createOrder(bookingId);

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
            const result = await paymentsService.verifySignature(bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
    }
}

module.exports = new PaymentsController();