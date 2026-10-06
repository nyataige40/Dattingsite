// Subscription, boost and super-like controller (Layer 4 monetization)
import { currentPlanFor, listPlans, subscribe, cancelSubscription, changePlan, runExpirySweep } from '../services/subscriptionService.js';
import { startBoost, activeBoosts, boostHistory, sendSuperLike, superLikesReceived, superLikesSent, cataloguePricing } from '../services/boostService.js';

const fail = (res, err) => {
    const status = err.status || 500;
    if (status >= 500) console.error('Monetization error:', err);
    res.status(status).json({ message: err.message || 'Server error' });
};

export const getSubscription = async (req, res) => {
    try {
        res.json({ subscription: await currentPlanFor(req.user.id) });
    } catch (err) {
        fail(res, err);
    }
};

export const getPlans = async (req, res) => {
    try {
        res.json({ plans: listPlans() });
    } catch (err) {
        fail(res, err);
    }
};

export const createSubscription = async (req, res) => {
    try {
        const { plan, payment_method = 'wallet' } = req.body;
        if (!plan) return res.status(400).json({ message: 'plan is required' });
        const result = await subscribe(req.user.id, plan, { payment_method });
        res.status(201).json({ ...result, subscription: await currentPlanFor(req.user.id) });
    } catch (err) {
        fail(res, err);
    }
};

export const updateSubscription = async (req, res) => {
    try {
        const { plan, payment_method = 'wallet' } = req.body;
        if (!plan) return res.status(400).json({ message: 'plan is required' });
        const result = await changePlan(req.user.id, plan, { payment_method });
        res.json({ ...result, subscription: await currentPlanFor(req.user.id) });
    } catch (err) {
        fail(res, err);
    }
};

export const deleteSubscription = async (req, res) => {
    try {
        res.json(await cancelSubscription(req.user.id));
    } catch (err) {
        fail(res, err);
    }
};

export const getBoosts = async (req, res) => {
    try {
        res.json({ active: await activeBoosts(req.user.id), history: await boostHistory(req.user.id) });
    } catch (err) {
        fail(res, err);
    }
};

export const createBoost = async (req, res) => {
    try {
        const { type, payment_method = 'wallet' } = req.body;
        if (!type) return res.status(400).json({ message: 'type is required' });
        const sub = await currentPlanFor(req.user.id);
        const result = await startBoost(req.user.id, type, { payment_method, planId: sub.plan_id });
        res.status(201).json(result);
    } catch (err) {
        fail(res, err);
    }
};

export const getSuperLikes = async (req, res) => {
    try {
        res.json({ received: await superLikesReceived(req.user.id), sent: await superLikesSent(req.user.id) });
    } catch (err) {
        fail(res, err);
    }
};

export const createSuperLike = async (req, res) => {
    try {
        const { profile_id, message = null, payment_method = 'wallet' } = req.body;
        if (!profile_id) return res.status(400).json({ message: 'profile_id is required' });
        const sub = await currentPlanFor(req.user.id);
        const result = await sendSuperLike(req.user.id, profile_id, { message, payment_method, planId: sub.plan_id });
        res.status(201).json(result);
    } catch (err) {
        fail(res, err);
    }
};

export const getPricing = async (req, res) => {
    try {
        const sub = req.user ? await currentPlanFor(req.user.id) : { plan_id: 'free' };
        res.json(cataloguePricing(sub.plan_id));
    } catch (err) {
        fail(res, err);
    }
};

// Invoked on boot and hourly; retires plans whose period ended without renewal.
export const sweepSubscriptions = async (req, res) => {
    try {
        res.json(await runExpirySweep());
    } catch (err) {
        fail(res, err);
    }
};