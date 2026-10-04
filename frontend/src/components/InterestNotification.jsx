import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Heart } from '../components/Icons';

const InterestNotification = ({ notifications, onClose, isVisible }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isVisible && notifications.length > 0 && !dismissed) {
      const timer = setTimeout(() => {}, 10000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, notifications, dismissed]);

  if (!isVisible || dismissed || !notifications || notifications.length === 0) return null;

  const handleViewMatches = () => {
    onClose();
    navigate('/catalogue');
  };

  const handleDismiss = () => {
    setDismissed(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay" onClick={handleDismiss} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Heart size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Special Interest Alert</h3>
              <p className="text-sm opacity-90">{notifications.length} members are interested in you!</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {notifications.slice(0, 3).map((notif, i) => (
            <div key={notif.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors">
              <img
                src={notif.photo_url || `https://i.pravatar.cc/60?img=${10 + i}`}
                alt={notif.full_name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white"
                onError={(e) => { e.target.src = `https://i.pravatar.cc/60?img=${50 + i}`; }}
              />
              <div className="flex-1">
                <p className="font-semibold text-text">{notif.full_name || 'A member'}</p>
                <p className="text-sm text-text-secondary">{notif.message}</p>
                <span className={`tier-badge ${notif.tier === 'Elite' ? 'tier-elite' : notif.tier === 'Premium' ? 'tier-premium' : 'tier-standard'}`}>
                  {notif.tier}
                </span>
              </div>
            </div>
          ))}

          <button
            onClick={handleViewMatches}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            <span>View Your Matches</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <path d="M12 19l7-7-7-7" />
            </svg>
          </button>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white hover:text-gray-200 transition-colors"
          title="Close notification"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default InterestNotification;
