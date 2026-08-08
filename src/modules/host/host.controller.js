// src/modules/host/host.controller.js
const User = require('../auth/user.model');

// Placeholder controller function for Razorpay Link Account Sync
async function syncRazorpayLinkedAccount(user, payoutData) {
    // In production, we would invoke Razorpay's accounts API:
    // const account = await razorpay.accounts.create({ ... });
    // return account.id;
    console.log(`[Razorpay Sync Placeholder] Creating linked account for user: ${user._id}`);
    
    // Return a mock Razorpay account ID for production-grade routing simulations
    return 'rzp_act_mock_' + Math.random().toString(36).substring(2, 9);
}

class HostController {
    
    async updatePayoutSettings(req, res) {
        try {
            const userId = req.user.id;
            const { type, accountHolderName, accountNumber, ifscCode, upiId } = req.body;

            if (type !== 'bank' && type !== 'upi') {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Invalid payout type. Choose either "bank" or "upi".' 
                });
            }

            const payoutDetails = {
                accountHolderName: '',
                accountNumber: '',
                ifscCode: '',
                upiId: '',
                razorpayAccountId: null,
                isPayoutConfigured: true
            };

            // Validation checks
            if (type === 'bank') {
                if (!accountHolderName || !accountNumber || !ifscCode) {
                    return res.status(400).json({ 
                        status: 'error', 
                        message: 'All bank account details (Holder Name, Account Number, IFSC) are required.' 
                    });
                }

                const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
                if (!ifscRegex.test(ifscCode)) {
                    return res.status(400).json({ 
                        status: 'error', 
                        message: 'Invalid IFSC Code format.' 
                    });
                }

                payoutDetails.accountHolderName = accountHolderName.trim();
                payoutDetails.accountNumber = accountNumber.trim();
                payoutDetails.ifscCode = ifscCode.trim().toUpperCase();
            } else {
                if (!upiId) {
                    return res.status(400).json({ 
                        status: 'error', 
                        message: 'UPI ID is required.' 
                    });
                }

                const upiRegex = /^[a-zA-Z0-9.-]+@[a-zA-Z0-9.-]+$/;
                if (!upiRegex.test(upiId)) {
                    return res.status(400).json({ 
                        status: 'error', 
                        message: 'Invalid UPI ID format. Ensure it follows username@bankName pattern.' 
                    });
                }

                payoutDetails.upiId = upiId.trim().toLowerCase();
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ 
                    status: 'error', 
                    message: 'User not found.' 
                });
            }

            // Sync with Razorpay Linked Accounts
            const razorpayAccountId = await syncRazorpayLinkedAccount(user, payoutDetails);
            payoutDetails.razorpayAccountId = razorpayAccountId;

            // Save to database
            user.payoutDetails = payoutDetails;
            await user.save();

            return res.status(200).json({
                status: 'success',
                message: 'Payout details configured successfully!',
                data: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                    profileImage: user.profileImage || '',
                    kycStatus: user.kycStatus || 'NOT_SUBMITTED',
                    kycDetails: user.kycDetails || {},
                    payoutDetails: user.payoutDetails
                }
            });

        } catch (error) {
            return res.status(500).json({ 
                status: 'error', 
                message: error.message 
            });
        }
    }
}

module.exports = {
    HostController: new HostController(),
    syncRazorpayLinkedAccount
};
