import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Upload, Check } from '../components/Icons';

const INTERESTS = [
  'Hiking', 'Travel', 'Cooking', 'Reading', 'Music', 'Art', 'Sports',
  'Photography', 'Food', 'Yoga', 'Dancing', 'Movies', 'Gaming',
  'Technology', 'Wine', 'Fitness', 'Books', 'Coffee', 'Nature', 'Design'
];

const OnboardingPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: '',
    age: '',
    bio: '',
    location: '',
    interests: [],
    photo_url: ''
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { createProfile } = useAuth();
  const navigate = useNavigate();

  const totalSteps = 3;

  const toggleInterest = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgData = event.target.result;
        setPhotoPreview(imgData);
        setFormData(prev => ({ ...prev, photo_url: imgData }));
      };
      reader.readAsDataURL(file);
    }
  };

  const useDemoPhoto = () => {
    const demoPhotos = [
      'https://i.pravatar.cc/300?img=15',
      'https://i.pravatar.cc/300?img=16',
      'https://i.pravatar.cc/300?img=17',
      'https://i.pravatar.cc/300?img=18',
      'https://i.pravatar.cc/300?img=19',
    ];
    const randomPhoto = demoPhotos[Math.floor(Math.random() * demoPhotos.length)];
    setPhotoPreview(randomPhoto);
    setFormData(prev => ({ ...prev, photo_url: randomPhoto }));
  };

  const handleSubmit = async () => {
    if (!formData.gender || !formData.age) {
      setError('Please specify your gender and age');
      return;
    }
    if (formData.interests.length === 0) {
      setError('Please select at least 3 interests');
      return;
    }
    if (!formData.photo_url) {
      setError('Please upload or select a profile photo');
      return;
    }

    setLoading(true);
    try {
      await createProfile(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            i + 1 === step ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md' :
            i + 1 < step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {i + 1 < step ? <Check size={16} /> : i + 1}
          </div>
          {i < totalSteps - 1 && <div className={`w-16 h-1 mx-2 ${i + 1 < step ? 'bg-primary' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-secondary">Set Up Your Profile</h1>
          <p className="text-text-secondary mt-1">Step {step} of {totalSteps}</p>
        </div>

        {renderStepIndicator()}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error}</div>}

        <div className="card">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Man' })}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    formData.gender === 'Man' ? 'border-primary bg-primary-50 text-primary' : 'border-border hover:border-primary-300'
                  }`}
                >
                  <div className="text-3xl mb-1">👨</div>
                  <div className="font-semibold">Man</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: 'Woman' })}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    formData.gender === 'Woman' ? 'border-primary bg-primary-50 text-primary' : 'border-border hover:border-primary-300'
                  }`}
                >
                  <div className="text-3xl mb-1">👩</div>
                  <div className="font-semibold">Woman</div>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Age</label>
                <input
                  type="number"
                  min="18"
                  max="80"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="input-field"
                  placeholder="Your age"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-field"
                  placeholder="City, State"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text">Profile Photo</h2>
              <div className="flex justify-center">
                <div className="relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md" />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center text-text-secondary">
                      <Upload size={32} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Upload Photo
                </button>
                <button
                  type="button"
                  onClick={useDemoPhoto}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Use Demo Photo
                </button>
              </div>
              <p className="text-xs text-text-secondary text-center">
                Your photo will be kept secure and never shared without your consent.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text">Your Interests</h2>
              <p className="text-sm text-text-secondary">Select at least 3 interests</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INTERESTS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all text-center ${
                      formData.interests.includes(interest)
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                        : 'bg-gray-50 text-text-secondary hover:bg-gray-100 border border-border'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="input-field resize-none"
                  placeholder="Tell us about yourself..."
                  rows="4"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="btn-secondary"
          >
            Back
          </button>
          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="btn-primary"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Complete Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
