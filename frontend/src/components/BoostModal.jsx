import { useState } from 'react';
import { Rocket, X, CheckCircle, XCircle } from '../components/Icons';

const BOOST_COPY = {
  spotlight: 'Appear in the top slot of discovery for 6 hours',
  turbo: '10x more visibility for a full day',
  spotlight_weekly: 'Continuous top-of-feed placement for a week'
};

const BoostModal = ({ boost, busy, onClose, onConfirm }) => {
  if (!boost) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-text flex items-center gap-2">
            <Rocket size={20} className="text-amber-500" /> {boost.label} boost
          </h3>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-text-secondary mb-4">{BOOST_COPY[boost.id] || boost.note}</p>

          <div className="flex items-center gap-4 rounded-xl bg-amber-50 px-4 py-3 mb-4">
            <div className="text-2xl font-bold text-amber-700">{boost.multiplier}x</div>
            <div className="text-sm text-amber-900">
              visibility boost<br />
              for {boost.duration_hours} hours
            </div>
          </div>

          <div className={`rounded-xl px-4 py-3 text-sm ${boost.included ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
            {boost.included
              ? 'Included with your plan — activating this boost is free.'
              : `This boost costs $${Number(boost.price).toFixed(2)} and is charged to your wallet.`}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 btn btn-ghost border border-border">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 btn btn-primary disabled:opacity-60"
          >
            {busy ? 'Activating' : boost.included ? 'Activate free' : `Activate • $${Number(boost.price).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export const BoostToast = ({ message, kind, onClose }) => {
  if (!message) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg max-w-sm ${
      kind === 'error'
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-green-50 border-green-200 text-green-800'
    }`}>
      {kind === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 p-1 opacity-60 hover:opacity-100" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
};

export default BoostModal;