import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProfileCard from '../components/ProfileCard';
import InterestNotification from '../components/InterestNotification';
import { Bell, RefreshCw } from '../components/Icons';

const DashboardPage = () => {
  const [matches, setMatches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [newNotificationCount, setNewNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState([]);
  const { profile } = useAuth();

  const fetchMatches = async () => {
    try {
      const res = await api.get('/api/profile/matches');
      setMatches(res.data.matches || []);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      const notifs = res.data.notifications || [];
      setUnreadNotifs(notifs);
      setNewNotificationCount(res.data.new_notifications || 0);
      if (notifs.length > 0) {
        setShowNotification(true);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markRead = async () => {
    try {
      await api.put('/api/notifications/read');
      setUnreadNotifs([]);
      setNewNotificationCount(0);
    } catch (err) {
      console.error('Failed to mark notifications:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMatches(), fetchNotifications()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleCloseNotification = () => {
    setShowNotification(false);
  };

  const formatInterests = (interests) => {
    if (!interests) return [];
    if (typeof interests === 'string') {
      try {
        return JSON.parse(interests);
      } catch {
        return [];
      }
    }
    return interests;
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text">Discover Your Matches</h1>
            <p className="text-text-secondary mt-1">
              {newNotificationCount > 0
                ? `${newNotificationCount} people are interested in you`
                : 'People are actively looking for you'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchNotifications(); fetchMatches(); }}
              className="p-2 text-text-secondary hover:text-primary rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={20} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNotification(true)}
                className="p-2 text-text-secondary hover:text-primary rounded-lg hover:bg-gray-50 transition-colors"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Interest Notification Popup */}
        <InterestNotification
          notifications={unreadNotifs}
          isVisible={showNotification}
          onClose={handleCloseNotification}
        />

        {/* Your Profile Card */}
        {profile && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-text-secondary mb-3">Your Profile</h2>
            <div className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-border p-4">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Your profile" className="w-20 h-20 rounded-full object-cover border-2 border-white" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold text-2xl">
                  {profile.full_name?.[0] || '?'}
                </div>
              )}
              <div>
                <p className="font-bold text-lg">{profile.full_name || 'Update your profile'}</p>
                <p className="text-text-secondary">{profile.gender}, {profile.age}</p>
                <p className="text-sm text-text-secondary">{profile.location}</p>
              </div>
            </div>
          </div>
        )}

        {/* Matches Loading */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-border h-64 animate-pulse" />
            ))}
          </div>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {matches.map((match) => (
              <ProfileCard key={match.id} profile={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-text-secondary">No matches found yet. Check back later!</p>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <button
            onClick={() => { window.location.href = '/catalogue'; }}
            className="btn-gold text-lg py-3 px-8"
          >
            View Full Partner Catalogue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
