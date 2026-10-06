import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../context/BillingContext';
import ProfileCard from '../components/ProfileCard';
import UnlockModal from '../components/UnlockModal';
import SuperLikeModal from '../components/SuperLikeModal';
import BoostModal, { BoostToast } from '../components/BoostModal';
import { Star, Zap } from '../components/Icons';

const TIERS = ['Standard', 'Premium', 'Elite'];

const CataloguePage = () => {
  const [catalogue, setCatalogue] = useState([]);
  const [filteredCatalogue, setFilteredCatalogue] = useState([]);
  const [selectedTier, setSelectedTier] = useState('all');
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [prices, setPrices] = useState({});
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [superLikeTarget, setSuperLikeTarget] = useState(null);
  const [boostTarget, setBoostTarget] = useState(null);
  const [superLikedIds, setSuperLikedIds] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const { profile } = useAuth();
  const { pricing, boosts, superLikes, sendSuperLike, startBoost } = useBilling();

  const fetchCatalogue = async () => {
    setLoading(true);
    try {
      const params = selectedTier !== 'all' ? { tier: selectedTier } : {};
      const res = await api.get('/api/catalogue', { params });
      setCatalogue(res.data.catalogue || []);
      setFilteredCatalogue(res.data.catalogue || []);
      setWallet(res.data.wallet);
      setPrices(res.data.prices || {});
    } catch (err) {
      console.error('Failed to fetch catalogue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue();
  }, [selectedTier]);

  // Existing Super Likes render as already sent, so they are not charged twice
  useEffect(() => {
    let alive = true;
    api.get('/api/billing/superlikes')
      .then((res) => {
        if (!alive) return;
        setSuperLikedIds(new Set((res.data.sent || []).map((s) => s.profile_id)));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleUnlockClick = (p) => {
    if (p.is_unlocked) return;
    setSelectedProfile(p);
    setUnlockModalOpen(true);
  };

  const handleUnlock = (paymentMethod) => {
    const target = selectedProfile;
    if (!target) return;
    setUnlockModalOpen(false);

    api.post('/api/catalogue/unlock', {
      profileId: target.id,
      paymentMethod
    }).then(res => {
      if (res.data.unlocked) {
        setCatalogue(prev => prev.map(p =>
          p.id === target.id ? { ...p, is_unlocked: true } : p
        ));
        setFilteredCatalogue(prev => prev.map(p =>
          p.id === target.id ? { ...p, is_unlocked: true } : p
        ));
        setWallet({ balance: res.data.remaining_balance });
      }
    }).catch(err => {
      setToast({ kind: 'error', message: err.response?.data?.message || 'Unlock failed' });
    });
  };

  const confirmSuperLike = async (message) => {
    if (!superLikeTarget) return;
    setBusy(true);
    try {
      const res = await sendSuperLike(superLikeTarget.id, message);
      setSuperLikedIds(prev => new Set(prev).add(superLikeTarget.id));
      setToast({ kind: 'success', message: res.message });
      setSuperLikeTarget(null);
      fetchCatalogue();
    } catch (err) {
      setToast({ kind: 'error', message: err.response?.data?.message || 'Could not send Super Like' });
    } finally {
      setBusy(false);
    }
  };

  const confirmBoost = async () => {
    if (!boostTarget) return;
    setBusy(true);
    try {
      const res = await startBoost(boostTarget.id, 'wallet');
      setToast({ kind: 'success', message: res.message });
      setBoostTarget(null);
      fetchCatalogue();
    } catch (err) {
      setToast({ kind: 'error', message: err.response?.data?.message || 'Could not start boost' });
    } finally {
      setBusy(false);
    }
  };

  const activeBoostTypes = new Set(boosts.active.map((b) => b.type));
  const receivedSuperLikes = superLikes.received.length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text">Partner Catalogue</h1>
            <p className="text-text-secondary mt-1">Premium partners ready to connect</p>
          </div>
          <div className="flex items-center gap-3">
            {receivedSuperLikes > 0 && (
              <Link
                to="/transactions"
                className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110 transition-all"
              >
                <Star size={16} />
                <span className="text-sm font-semibold">
                  {receivedSuperLikes} Super Like{receivedSuperLikes === 1 ? '' : 's'} received
                </span>
              </Link>
            )}
            {wallet && (
              <div className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-xl">
                <span className="text-sm opacity-90">Wallet Balance:</span>
                <span className="font-bold ml-1">${wallet.balance.toFixed(2)} {wallet.currency}</span>
              </div>
            )}
          </div>
        </div>

        {/* Boost strip */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-amber-500" />
            <p className="text-sm font-bold text-text">Boost my profile</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(pricing?.boosts || []).map((b) => {
              const isActive = activeBoostTypes.has(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => !isActive && setBoostTarget(b)}
                  disabled={isActive}
                  className={`card text-left transition-all ${
                    isActive
                      ? 'border-amber-300 bg-amber-50/60 cursor-default'
                      : 'hover:border-amber-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-text text-sm">{b.label}</span>
                    <span className="text-xs font-bold text-amber-600">{b.multiplier}x</span>
                  </div>
                  <p className="text-xs text-text-secondary mb-2">{b.duration_hours}h window</p>
                  <span className={`text-xs font-bold ${b.included ? 'text-green-600' : 'text-text'}`}>
                    {isActive ? 'Active now' : b.included ? 'Included with plan' : `$${b.price.toFixed(2)}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedTier('all')}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedTier === 'all'
                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                : 'bg-white border border-border text-text-secondary hover:bg-gray-50'
            }`}
          >
            All Tiers
          </button>
          {TIERS.map(tier => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedTier === tier
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                  : 'bg-white border border-border text-text-secondary hover:bg-gray-50'
              }`}
            >
              <Star size={16} />
              <span>{tier}</span>
              <span className="text-xs opacity-80">(${prices[tier]?.toFixed(2)})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-border h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredCatalogue.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCatalogue.map((p) => (
              <div key={p.id} className="relative">
                <ProfileCard
                  profile={p}
                  superLiked={superLikedIds.has(p.id)}
                  onSuperLike={setSuperLikeTarget}
                />
                {!p.is_unlocked && (
                  <div
                    onClick={() => handleUnlockClick(p)}
                    className="absolute inset-0 bg-overlay bg-opacity-70 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <div className="text-center text-white">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Star size={24} fill="currentColor" />
                      </div>
                      <p className="font-semibold">Unlock to View</p>
                      <p className="text-sm mt-1">${p.price?.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-secondary">No partners found in this tier.</p>
          </div>
        )}

        {unlockModalOpen && selectedProfile && (
          <UnlockModal
            profile={selectedProfile}
            wallet={wallet}
            prices={prices}
            onClose={() => setUnlockModalOpen(false)}
            onUnlock={handleUnlock}
          />
        )}

        {superLikeTarget && (
          <SuperLikeModal
            profile={superLikeTarget}
            cost={pricing?.superLike?.cost}
            included={pricing?.superLike?.included}
            busy={busy}
            onClose={() => setSuperLikeTarget(null)}
            onConfirm={confirmSuperLike}
          />
        )}

        {boostTarget && (
          <BoostModal
            boost={boostTarget}
            busy={busy}
            onClose={() => setBoostTarget(null)}
            onConfirm={confirmBoost}
          />
        )}

        <BoostToast
          message={toast?.message}
          kind={toast?.kind}
          onClose={() => setToast(null)}
        />
      </div>
    </div>
  );
};

export default CataloguePage;
