import { useState } from 'react';
import api from '../services/api';
import { X, Lock } from '../components/Icons';

const UnlockModal = ({ profile, wallet, prices, onClose, onUnlock }) => {
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const price = prices[profile.tier] || 9.99;
  const hasSufficientFunds = wallet && wallet.balance >= price;

  const handleWalletUnlock = async () => {
    setProcessing(true);
    setError('');
    try {
      const res = await api.post('/api/catalogue/unlock', {
        profileId: profile.id,
        paymentMethod: 'wallet'
      });
      if (res.data.unlocked) {
        onUnlock('wallet');
      } else {
        setError(res.data.message || 'Unlock failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unlock failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleGatewayUnlock = async (method) => {
    if (method === 'stripe' && !hasSufficientFunds) {
      // For Stripe/PayPal, allow proceeding even without wallet balance
    }

    setProcessing(true);
    setError('');

    try {
      // For Stripe, get checkout session stub
      if (method === 'stripe') {
        const res = await api.post('/api/catalogue/add-funds', {
          amount: price,
          method: 'stripe'
        });
        // Simulate Stripe redirect flow
        alert(`Redirecting to Stripe...\nAmount: $${price.toFixed(2)}\n(Client Secret: ${res.data.clientSecret})`);
        onUnlock('stripe');
      } else if (method === 'paypal') {
        const res = await api.post('/api/catalogue/add-funds', {
          amount: price,
          method: 'paypal'
        });
        alert(`Redirecting to PayPal...\nAmount: $${price.toFixed(2)}`);
        onUnlock('paypal');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const tierLabels = {
    Standard: { label: 'Standard', color: 'from-pink-500 to-rose-600' },
    Premium: { label: 'Premium', color: 'from-purple-500 to-indigo-600' },
    Elite: { label: 'Elite', color: 'from-yellow-400 via-orange-500 to-red-500' }
  };

  const tierInfo = tierLabels[profile.tier] || tierLabels.Standard;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Locked Overlay Header */}
        <div className={`bg-gradient-to-r ${tierInfo.color} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full overflow-hidden flex-shrink-0">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Lock size={24} />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-lg">{profile.full_name || 'Partner Name'}</h3>
                <p className="text-sm opacity-90">{profile.age} • {profile.location}</p>
              </div>
            </div>
            <span className="tier-badge bg-white/20 text-white">
              {tierInfo.label} Tier
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-text mb-1">${price.toFixed(2)}</div>
            <p className="text-sm text-text-secondary">Unlock this partner to start chatting</p>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod('wallet')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                  paymentMethod === 'wallet'
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-border text-text-secondary hover:border-primary-300'
                }`}
              >
                Wallet
                {wallet && <span className="block text-xs mt-1">\${wallet.balance.toFixed(2)}</span>}
              </button>
              <button
                onClick={() => setPaymentMethod('stripe')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                  paymentMethod === 'stripe'
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-border text-text-secondary hover:border-primary-300'
                }`}
              >
                Stripe
              </button>
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                  paymentMethod === 'paypal'
                    ? 'border-primary bg-primary-50 text-primary'
                    : 'border-border text-text-secondary hover:border-primary-300'
                }`}
              >
                PayPal
              </button>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error}</div>}

          {/* Wallet Balance Warning */}
          {paymentMethod === 'wallet' && wallet && wallet.balance < price && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl mb-4">
              Insufficient wallet balance. Add funds or use a payment gateway.
            </div>
          )}

          <button
            onClick={() => {
              if (paymentMethod === 'wallet') {
                if (!hasSufficientFunds) {
                  setError('Insufficient wallet balance. Use Stripe or PayPal.');
                  return;
                }
                handleWalletUnlock();
              } else {
                handleGatewayUnlock(paymentMethod);
              }
            }}
            disabled={processing}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {processing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {processing ? 'Processing...' : `Unlock Partner - $${price.toFixed(2)}`}
          </button>

          <div className="mt-4 text-center">
            <p className="text-xs text-text-secondary">
              By unlocking, you agree to our Terms of Service. Your payment is secure.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default UnlockModal;
