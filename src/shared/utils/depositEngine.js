// src/shared/utils/depositEngine.js

const CATEGORY_RULES = {
    ELECTRONICS: { depositPercentage: 0.08, maxDepositCap: 8000, baseDailyPremium: 100 },
    VEHICLES: { depositPercentage: 0.05, maxDepositCap: 5000, baseDailyPremium: 250 },
    LIFESTYLE: { depositPercentage: 0.05, maxDepositCap: 1500, baseDailyPremium: 30 },
    DEFAULT: { depositPercentage: 0.06, maxDepositCap: 3000, baseDailyPremium: 50 }
};

const PLATFORM_FIXED_FEE = 50;

const calculateBookingPricing = (category, mrp, dailyRent, durationDays, userCibilScore = 750) => {
    const rule = CATEGORY_RULES[category.toUpperCase()] || CATEGORY_RULES.DEFAULT;
    const totalRent = dailyRent * durationDays;

    let calculatedDeposit = mrp * rule.depositPercentage;
    if (calculatedDeposit > rule.maxDepositCap) {
        calculatedDeposit = rule.maxDepositCap;
    }

    // CIBIL Trust discount (40% off liability)
    if (userCibilScore >= 750) {
        calculatedDeposit = calculatedDeposit * 0.60;
    }

    const totalInsurance = rule.baseDailyPremium * durationDays;
    const finalDeposit = Math.round(calculatedDeposit);
    const totalPayableNow = totalRent + totalInsurance + PLATFORM_FIXED_FEE + finalDeposit;

    const platformCommissionFromHost = totalRent * 0.10;
    const finalHostPayout = totalRent - platformCommissionFromHost;

    return {
        pricingBreakdown: {
            baseRent: totalRent,
            insurancePremium: totalInsurance,
            platformFee: PLATFORM_FIXED_FEE,
            securityDeposit: finalDeposit
        },
        totals: {
            userTotalPayable: totalPayableNow,
            hostTotalEarned: Math.round(finalHostPayout),
            platformNetProfit: Math.round(PLATFORM_FIXED_FEE + platformCommissionFromHost)
        }
    };
};

module.exports = { calculateBookingPricing };