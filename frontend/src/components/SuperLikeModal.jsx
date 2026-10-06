import { useState } from 'react';
import { HeartFilled, X } from '../components/Icons';

const SuperLikeModal = ({ profile, cost, included, onClose, onConfirm, busy }) => {
  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-text flex items-center gap-2">
            <HeartFilled size={20} className="text-primary" /> Super Like
          </h3>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-200" />
            )}
            <div>
              <p className="font-bold text-text">{profile.full_name}</p>
              <p className="text-sm text-text-secondary">
                {profile.age ? `${profile.age} • ` : ''}{profile.location}
              </p>
            </div>
          </div>

          <div className={`rounded-xl px-4 py-3 text-sm mb-4 ${included ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
            {included
              ? 'Super Likes are included with your plan — this one is free.'
              : `A Super Like costs $${Number(cost || 0).toFixed(2)} and is charged to your wallet.`}
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1.5">
            Add a note (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder={`Hey ${String(profile.full_name || '').split(' ')[0]}, really liked your profile…`}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
          />
          <p className="text-[11px] text-text-secondary mt-1 text-right">{message.length}/280</p>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 btn btn-ghost border border-border">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(message.trim() || null)}
            disabled={busy}
            className="flex-1 btn text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Sending' : included ? 'Send free' : `Send • $${Number(cost || 0).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperLikeModal;