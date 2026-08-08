// src/shared/utils/pricing.utils.js

/**
 * Calculates enterprise booking pricing breakdown with 18% GST and two-sided commissions.
 *
 * @param {number} rentPerDay - Daily rent of the listing
 * @param {number} rentalDays - Number of days of the booking
 * @param {number} cibilScore - Renter's CIBIL score
 * @param {number} [mrp=10000] - Manufacturer Suggested Retail Price for deposit calculations
 * @param {string} [category='ELECTRONICS'] - Listing category
 * @returns {object} Financial breakdown audit fields
 */
function calculateEnterpriseBreakdown(rentPerDay, rentalDays, cibilScore, mrp = 10000, category = 'ELECTRONICS') {
    const baseRentalFee = Math.round(rentPerDay * rentalDays);

    // Renter Side Charges: 5% fee with min ₹5 cap, plus 18% GST
    const userPlatformFee = Math.max(Math.round(baseRentalFee * 0.05), 5);
    const userGstFee = Math.round(userPlatformFee * 0.18);
    const totalUserPlatformServiceCharge = userPlatformFee + userGstFee;

    // Host Side Deductions: 8% Host Commission, plus 18% GST
    const hostCommissionFee = Math.round(baseRentalFee * 0.08);
    const hostGstFee = Math.round(hostCommissionFee * 0.18);
    const totalHostDeduction = hostCommissionFee + hostGstFee;
    const hostNetPayout = baseRentalFee - totalHostDeduction;

    // Security Deposit Waiver (CIBIL Logic)
    const CATEGORY_RULES = {
        ELECTRONICS: { depositPercentage: 0.08, maxDepositCap: 8000 },
        VEHICLES: { depositPercentage: 0.05, maxDepositCap: 5000 },
        LIFESTYLE: { depositPercentage: 0.05, maxDepositCap: 1500 },
        DEFAULT: { depositPercentage: 0.06, maxDepositCap: 3000 }
    };

    const rule = CATEGORY_RULES[category?.toUpperCase()] || CATEGORY_RULES.DEFAULT;
    let baseDeposit = mrp * rule.depositPercentage;
    if (baseDeposit > rule.maxDepositCap) {
        baseDeposit = rule.maxDepositCap;
    }

    let waiver = 0;
    if (cibilScore >= 750) {
        waiver = 0.40;
    } else if (cibilScore >= 650) {
        waiver = 0.20;
    }

    const refundableDeposit = Math.round(baseDeposit * (1 - waiver));

    // Summary Totals
    const totalUserPayable = baseRentalFee + totalUserPlatformServiceCharge + refundableDeposit;
    const totalPlatformProfit = userPlatformFee + hostCommissionFee;
    const totalGstLiability = userGstFee + hostGstFee;

    return {
        baseRentalFee,
        userPlatformFee,
        userGstFee,
        totalUserPlatformServiceCharge,
        hostCommissionFee,
        hostGstFee,
        totalHostDeduction,
        hostNetPayout,
        baseDeposit,
        refundableDeposit,
        totalUserPayable,
        totalPlatformProfit,
        totalGstLiability
    };
}

module.exports = {
    calculateEnterpriseBreakdown
};
