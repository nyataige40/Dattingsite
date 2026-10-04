// Payment service with mock wallet and gateway stubs (Stripe/PayPal)
import { WalletModel, TransactionModel, UnlockedPartnerModel, ProfileModel } from '../models/index.js';

export const PRICES = {
    Standard: 9.99,
    Premium: 29.99,
    Elite: 99.99
};

export const PRICE_STANDARD = 9.99;

// Check if a profile is unlocked for a user
export const checkProfileUnlocked = async (userId, profileId) => {
    const unlocked = await UnlockedPartnerModel.isUnlocked(userId, profileId);
    return unlocked;
};

// Attempt to unlock a profile using wallet balance
export const unlockProfileWithWallet = async (userId, profileId) => {
    const profile = await ProfileModel.findById(profileId);
    if (!profile) {
        throw new Error('Profile not found');
    }

    const price = PRICES[profile.tier] || PRICES.Standard;
    const wallet = await WalletModel.findByUserId(userId);

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    if (wallet.balance < price) {
        throw new Error('Insufficient wallet balance');
    }

    const deductResult = await WalletModel.deduct(userId, price);
    if (!deductResult.success) {
        throw new Error(deductResult.message);
    }

    await UnlockedPartnerModel.unlock(userId, profileId);
    await TransactionModel.create({
        user_id: userId,
        profile_id: profileId,
        amount: price,
        payment_method: 'wallet',
        payment_status: 'completed'
    });

    return {
        success: true,
        amount: price,
        remaining_balance: wallet.balance - price,
        message: `Profile unlocked! ${price.toFixed(2)} USD deducted from wallet.`
    };
};

// Stub for Stripe payment (simulated)
export const unlockProfileWithStripe = async (userId, profileId, paymentIntent = {}) => {
    const profile = await ProfileModel.findById(profileId);
    if (!profile) {
        throw new Error('Profile not found');
    }

    const price = PRICES[profile.tier] || PRICES.Standard;
    const transactionRef = `stripe_pi_${Date.now()}`;

    await UnlockedPartnerModel.unlock(userId, profileId);
    await TransactionModel.create({
        user_id: userId,
        profile_id: profileId,
        amount: price,
        payment_method: 'stripe',
        payment_status: 'completed',
        transaction_ref: transactionRef
    });

    return {
        success: true,
        amount: price,
        payment_method: 'stripe',
        transaction_ref: transactionRef,
        clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
        message: `Profile unlocked via Stripe! ${price.toFixed(2)} USD charged to your card.`
    };
};

// Stub for PayPal payment (simulated)
export const unlockProfileWithPayPal = async (userId, profileId, paymentId = null) => {
    const profile = await ProfileModel.findById(profileId);
    if (!profile) {
        throw new Error('Profile not found');
    }

    const price = PRICES[profile.tier] || PRICE_STANDARD;
    const transactionRef = paymentId || `paypal_${Date.now()}`;

    await UnlockedPartnerModel.unlock(userId, profileId);
    await TransactionModel.create({
        user_id: userId,
        profile_id: profileId,
        amount: price,
        payment_method: 'paypal',
        payment_status: 'completed',
        transaction_ref: transactionRef
    });

    return {
        success: true,
        amount: price,
        payment_method: 'paypal',
        transaction_ref: transactionRef,
        message: `Profile unlocked via PayPal! ${price.toFixed(2)} USD charged.`
    };
};

// Add funds to wallet (mock top-up)
export const addFundsToWallet = async (userId, amount) => {
    const wallet = await WalletModel.findByUserId(userId);
    if (!wallet) {
        throw new Error('Wallet not found');
    }

    const result = await WalletModel.addFunds(userId, parseFloat(amount));
    return {
        success: result.success,
        new_balance: wallet.balance + parseFloat(amount)
    };
};
