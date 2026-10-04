// Catalogue controller: handles tiered partner catalogue with unlock logic
import { ProfileModel } from '../models/index.js';
import { WalletModel } from '../models/index.js';
import { UnlockedPartnerModel } from '../models/index.js';
import { TransactionModel } from '../models/index.js';
import { PRICES, unlockProfileWithWallet, unlockProfileWithStripe, unlockProfileWithPayPal, checkProfileUnlocked } from '../services/paymentService.js';

export const getCatalogue = async (req, res) => {
    try {
        const userId = req.user.id;
        const { tier } = req.query;

        let tiers = ['Standard', 'Premium', 'Elite'];
        if (tier && tiers.includes(tier)) {
            tiers = [tier];
        }

        const userProfiles = await ProfileModel.findByUserId(userId);
        const userGender = userProfiles?.gender || 'Man';
        const targetGender = userGender === 'Man' ? 'Woman' : 'Man';

        const allProfiles = [];

        for (const t of tiers) {
            const profiles = await ProfileModel.findBotsByGenderAndTier(targetGender, t);
            allProfiles.push(...profiles);
        }

        // Check which profiles are unlocked by this user
        const catalogue = [];
        for (const profile of allProfiles) {
            const isUnlocked = await UnlockedPartnerModel.isUnlocked(userId, profile.id);
            catalogue.push({
                id: profile.id,
                full_name: profile.full_name || profile.bot_persona,
                age: profile.age,
                bio: profile.bio,
                location: profile.location,
                interests: profile.interests ? JSON.parse(profile.interests) : [],
                photo_url: profile.photo_url,
                tier: profile.tier,
                price: PRICES[profile.tier] || PRICES.Standard,
                is_bot: !!profile.is_bot,
                is_unlocked: isUnlocked
            });
        }

        const wallet = await WalletModel.findByUserId(userId);

        res.json({
            catalogue,
            wallet: wallet ? { balance: wallet.balance, currency: wallet.currency } : null,
            prices: PRICES
        });
    } catch (err) {
        console.error('Catalogue error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

export const unlockPartner = async (req, res) => {
    try {
        const userId = req.user.id;
        const { profileId, paymentMethod } = req.body;

        if (!profileId) {
            return res.status(400).json({ message: 'Profile ID is required' });
        }

        // Check if already unlocked
        const alreadyUnlocked = await checkProfileUnlocked(userId, profileId);
        if (alreadyUnlocked) {
            return res.json({ unlocked: true, message: 'Partner already unlocked' });
        }

        let result;

        if (paymentMethod === 'stripe' || paymentMethod === 'paypal') {
            if (paymentMethod === 'stripe') {
                result = await unlockProfileWithStripe(userId, profileId);
            } else {
                result = await unlockProfileWithPayPal(userId, profileId);
            }
        } else {
            // Default: wallet
            result = await unlockProfileWithWallet(userId, profileId);
        }

        res.json({
            unlocked: true,
            ...result
        });
    } catch (err) {
        res.status(400).json({ unlocked: false, message: err.message });
    }
};

export const addFunds = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, method } = req.body;

        if (!amount || amount < 1) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (method === 'add') {
            const { addFundsToWallet } = await import('../services/paymentService.js');
            const result = await addFundsToWallet(userId, parseFloat(amount));
            res.json(result);
        } else {
            // Return Stripe/PayPal checkout stub data
            const stripeData = {
                clientSecret: `pi_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
                publishableKey: 'pk_test_placeholder_stripe_key',
                amount: parseFloat(amount)
            };

            res.json({
                method: method === 'stripe' ? 'stripe' : 'paypal',
                ...stripeData
            });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const transactions = await TransactionModel.getByUserId(userId);
        res.json({ transactions });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
