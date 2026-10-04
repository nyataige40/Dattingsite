import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProfileCard from '../components/ProfileCard';
import UnlockModal from '../components/UnlockModal';
import { Star } from '../components/Icons';

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
  const { profile } = useAuth();

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

  const handleUnlockClick = (profile) => {
    if (profile.is_unlocked) return;
    setSelectedProfile(profile);
    setUnlockModalOpen(true);
  };

  const handleUnlock = (paymentMethod) => {
    const profile = selectedProfile;
    if (!profile) return;

    api.post('/api/catalogue/unlock', {
      profileId: profile.id,
      paymentMethod
    }).then(res => {
      if (res.data.unlocked) {
        setCatalogue(prev => prev.map(p =>
          p.id === profile.id ? { ...p, is_unlocked: true } : p
        ));
        setFilteredCatalogue(prev => prev.map(p =>
          p.id === profile.id ? { ...p, is_unlocked: true } : p
        ));
        setWallet({ balance: res.data.remaining_balance });
      }
    }).catch(err => {
      console.error('Unlock failed:', err);
    });
    setUnlockModalOpen(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text">Partner Catalogue</h1>
            <p className="text-text-secondary mt-1">Premium partners ready to connect</p>
          </div>
          {wallet && (
            <div className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-xl">
              <span className="text-sm opacity-90">Wallet Balance:</span>
              <span className="font-bold ml-1">${wallet.balance.toFixed(2)} {wallet.currency}</span>
            </div>
          )}
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
                <ProfileCard profile={p} />
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
      </div>
    </div>
  );
};

export default CataloguePage;
