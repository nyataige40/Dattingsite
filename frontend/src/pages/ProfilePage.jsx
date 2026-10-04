import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Check, Upload } from '../components/Icons';

const INTERESTS = [
  'Hiking', 'Travel', 'Cooking', 'Reading', 'Music', 'Art', 'Sports',
  'Photography', 'Food', 'Yoga', 'Dancing', 'Movies', 'Gaming',
  'Technology', 'Wine', 'Fitness', 'Books', 'Coffee', 'Nature', 'Design'
];

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [interests, setInterests] = useState([]);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { setProfile: updateContextProfile } = useAuth();

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/profile');
      const data = res.data.profile;
      setProfile(data);
      setInterests(data.interests || []);
      setBio(data.bio || '');
      setLocation(data.location || '');
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const toggleInterest = (interest) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/api/profile', {
        bio,
        location,
        interests,
        photo_url: profile.photo_url
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchProfile();
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-6">My Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="card text-center">
              <div className="mb-4">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mx-auto" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center mx-auto border-4 border-white">
                    <Upload size={32} className="text-primary" />
                  </div>
                )}
              </div>
              <h2 className="font-bold text-lg text-text">{profile?.full_name}</h2>
              <p className="text-text-secondary">{profile?.gender}, {profile?.age}</p>
              <p className="text-sm text-text-secondary mt-1">{profile?.location}</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-xl font-semibold text-text mb-4">About Me</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="input-field resize-none"
                    placeholder="Tell us about yourself..."
                    rows="4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="input-field"
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold text-text mb-4">Interests</h2>
              <p className="text-sm text-text-secondary mb-3">Select your interests to find better matches</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all text-center ${
                      interests.includes(interest)
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                        : 'bg-gray-50 text-text-secondary hover:bg-gray-100 border border-border'
                    }`}
                  >
                    {interest}
                    {interests.includes(interest) && <Check size={14} className="inline ml-1" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary px-6 py-2 flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
