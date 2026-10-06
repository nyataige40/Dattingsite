import { Link } from 'react-router-dom';
import { Heart, HeartFilled } from './Icons';

const ProfileCard = ({ profile, showUnlockButton = false, superLiked = false, onSuperLike = null }) => {
  const tierColors = {
    Standard: 'tier-standard',
    Premium: 'tier-premium',
    Elite: 'tier-elite'
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all group">
      <div className="relative">
        {profile.photo_url ? (
          <img
            src={profile.photo_url}
            alt={profile.full_name}
            className="w-full h-48 object-cover"
            onError={(e) => { e.target.src = `https://i.pravatar.cc/300?img=${Math.floor(Math.random() * 70)}`; }}
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No photo</span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`tier-badge ${tierColors[profile.tier] || 'tier-standard'}`}>
            {profile.tier}
          </span>
        </div>
        {profile.is_bot && (
          <div className="absolute top-3 right-3 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
            AI Companion
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg text-text">{profile.full_name}</h3>
          {profile.age && <span className="text-text-secondary">{profile.age}</span>}
        </div>

        {profile.location && (
          <p className="text-sm text-text-secondary mb-2">{profile.location}</p>
        )}

        {profile.bio && (
          <p className="text-sm text-text-secondary mb-3 line-clamp-2">{profile.bio}</p>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {profile.interests.slice(0, 3).map((interest, i) => (
              <span key={i} className="text-xs bg-gray-100 text-text-secondary px-2 py-0.5 rounded-full">
                {interest}
              </span>
            ))}
          </div>
        )}

        {showUnlockButton && !profile.is_unlocked && (
          <Link
            to={`/catalogue`}
            className="block w-full btn-primary text-sm py-2 text-center mt-2"
          >
            Unlock - ${profile.price?.toFixed(2)}
          </Link>
        )}

        {showUnlockButton && profile.is_unlocked && (
          <Link
            to={`/chat/${profile.id}`}
            className="block w-full btn-secondary text-sm py-2 text-center mt-2"
          >
            Chat Now
          </Link>
        )}

        {profile.is_unlocked && onSuperLike && (
          superLiked ? (
            <span className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold bg-primary-50 text-primary border border-primary-100">
              <HeartFilled size={16} /> Super Like sent
            </span>
          ) : (
            <button
              onClick={() => onSuperLike(profile)}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110 transition-all"
            >
              <HeartFilled size={16} /> Super Like
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
