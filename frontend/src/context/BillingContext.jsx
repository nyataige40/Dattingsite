import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { billing } from '../services/api';
import { useAuth } from './AuthContext';

const BillingContext = createContext();

export const useBilling = () => {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error('useBilling must be used within BillingProvider');
  return ctx;
};

export const BillingProvider = ({ children }) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [boosts, setBoosts] = useState({ active: [], history: [] });
  const [superLikes, setSuperLikes] = useState({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setPlan(null);
      setBoosts({ active: [], history: [] });
      setSuperLikes({ received: [], sent: [] });
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [sub, boostsRes, slRes] = await Promise.all([
        billing.subscription(),
        billing.boosts(),
        billing.superLikes()
      ]);
      setPlan(sub.subscription);
      setBoosts(boostsRes);
      setSuperLikes(slRes);

      // Pricing is plan-aware, so it has to be read after the plan resolves.
      try {
        setPricing(await billing.pricing());
      } catch (_) {
        setPricing(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load billing');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const changePlan = async (nextPlan, paymentMethod = 'wallet') => {
    const res = await billing.changePlan(nextPlan, paymentMethod);
    setPlan(res.subscription);
    setPricing(await billing.pricing());
    return res;
  };

  const cancelSubscription = async () => {
    const res = await billing.cancelSubscription();
    await refresh();
    return res;
  };

  const startBoost = async (type, paymentMethod = 'wallet') => {
    const res = await billing.startBoost(type, paymentMethod);
    const fresh = await billing.boosts();
    setBoosts(fresh);
    return res;
  };

  const sendSuperLike = async (profileId, message = null) => {
    const res = await billing.sendSuperLike(profileId, message);
    setSuperLikes(await billing.superLikes());
    return res;
  };

  return (
    <BillingContext.Provider
      value={{
        plan,
        pricing,
        boosts,
        superLikes,
        loading,
        error,
        refresh,
        changePlan,
        cancelSubscription,
        startBoost,
        sendSuperLike,
        isPaid: plan?.status === 'active' && plan?.plan_id !== 'free'
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export default BillingContext;