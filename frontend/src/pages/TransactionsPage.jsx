import { useState, useEffect } from 'react';
import api, { billing } from '../services/api';
import { useBilling } from '../context/BillingContext';
import {
  Sparkles, Crown, Zap, Rocket, HeartFilled, Check, Clock, XCircle,
  CheckCircle, TrendingUp, AlertTriangle
} from '../components/Icons';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const dateLabel = (d) =>
  d ? new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const PLAN_STYLES = {
  free: { ring: 'border-border', badge: 'bg-gray-100 text-text-secondary', icon: Sparkles },
  plus: { ring: 'border-primary ring-2', badge: 'bg-primary text-white', icon: Sparkles },
  gold: { ring: 'border-amber-400 ring-2', badge: 'bg-gradient-to-r from-amber-400 to-amber-600 text-white', icon: Crown }
};

const BOOST_ICONS = { spotlight: Zap, turbo: Rocket, spotlight_weekly: Rocket };

function Banner({ kind, children, onClose }) {
  if (!kind) return null;
  const tones = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };
  return (
    <div className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 text-sm mb-6 ${tones[kind]}`}>
      <span className="flex items-center gap-2">
        {kind === 'success' ? <CheckCircle size={18} /> : kind === 'error' ? <XCircle size={18} /> : <AlertTriangle size={18} />}
        {children}
      </span>
      <button onClick={onClose} className="p-1 opacity-60 hover:opacity-100" aria-label="Dismiss">
            <X size={16} />
          </button>
    </div>
  );
}

const TransactionsPage = () => {
  const { plan, pricing, boosts, superLikes, loading, changePlan, cancelSubscription, startBoost, refresh } = useBilling();
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [busy, setBusy] = useState(null);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, cat, t] = await Promise.all([
          billing.plans(),
          api.get('/api/catalogue'),
          api.get('/api/catalogue/transactions')
        ]);
        if (!alive) return;
        setPlans(p.plans || []);
        setWallet(cat.data.wallet || null);
        setTransactions(t.data.transactions || []);
      } catch (err) {
        if (alive) setBanner({ kind: 'error', text: err.response?.data?.message || 'Could not load billing data' });
      }
    })();
    return () => { alive = false; };
  }, []);

  const notify = (kind, text) => setBanner({ kind, text });

  const loadWallet = async () => {
    try {
      const res = await api.get('/api/catalogue');
      setWallet(res.data.wallet || null);
    } catch (_) {
      /* balance is cosmetic; a failure here must not break the page */
    }
  };

  const run = async (key, fn, successFallback) => {
    setBusy(key);
    setBanner(null);
    try {
      const res = await fn();
      notify('success', res?.message || successFallback);
      await Promise.all([refresh(), loadWallet()]);
      return res;
    } catch (err) {
      notify('error', err.response?.data?.message || 'Something went wrong');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const onTopUp = () => {
    const raw = window.prompt('Top up amount in USD', '25');
    const amount = Number(raw);
    if (!amount || amount < 1) return;
    run('topup', () => api.post('/api/catalogue/add-funds', { amount, method: 'add' }).then((r) => r.data), 'Wallet topped up.');
  };

  const onChangePlan = (target) => {
    if (target === 'free') {
      if (!window.confirm('Cancel your subscription and drop to the Free plan?')) return;
      return run('plan', cancelSubscription, 'Subscription cancelled.');
    }
    return run('plan', () => changePlan(target, 'wallet'), `Switched to ${target}.`);
  };

  const onBoost = (type) => run(`boost-${type}`, () => startBoost(type, 'wallet'), 'Boost started.');

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-32 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const currentId = plan?.status === 'active' ? plan.plan_id : 'free';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text">Billing &amp; Plan</h1>
            <p className="text-text-secondary mt-1">
              Manage your subscription, buy visibility boosts, and review every charge.
            </p>
          </div>
          {wallet && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-text-secondary font-semibold">Wallet balance</p>
              <p className="text-2xl font-bold text-primary">{money(wallet.balance)}</p>
              <button
                onClick={onTopUp}
                disabled={busy === 'topup'}
                className="mt-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {busy === 'topup' ? 'Adding' : 'Top up'}
              </button>
            </div>
          )}
        </div>

        <Banner kind={banner?.kind} onClose={() => setBanner(null)}>{banner?.text}</Banner>

        {/* Current plan */}
        <section className="card mb-8 bg-gradient-to-br from-primary-50 to-white border-primary-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-secondary font-semibold">Current plan</p>
              <p className="text-2xl font-bold text-text mt-1">{plan?.label || 'Free'}</p>
              <p className="text-sm text-text-secondary mt-1">
                {plan?.status === 'active' && plan.plan_id !== 'free'
                  ? `Renews ${dateLabel(plan.renews_at)} • ${plan.auto_renew ? 'auto-renew on' : 'auto-renew off'}`
                  : 'Free forever. Upgrade any time.'}
              </p>
            </div>
            {plan?.status === 'active' && plan.plan_id !== 'free' && (
              <button
                onClick={() => onChangePlan('free')}
                disabled={busy === 'plan'}
                className="btn btn-ghost border border-border text-text-secondary hover:text-red-600"
              >
                Cancel subscription
              </button>
            )}
          </div>
        </section>

        {/* Plans */}
        <h2 className="text-xl font-bold text-text mb-4">Upgrade your plan</h2>
        <div className="grid gap-5 md:grid-cols-3 mb-10">
          {plans.map((p) => {
            const style = PLAN_STYLES[p.id] || PLAN_STYLES.free;
            const PlanIcon = style.icon;
            const isCurrent = currentId === p.id;
            return (
              <div key={p.id} className={`card relative flex flex-col ${style.ring}`}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-primary to-secondary">
                    Most popular
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <PlanIcon size={22} className={p.id === 'gold' ? 'text-amber-500' : 'text-primary'} />
                  <h3 className="text-lg font-bold text-text">{p.label}</h3>
                  {isCurrent && <span className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-bold ${style.badge}`}>Current</span>}
                </div>
                <p className="text-3xl font-bold text-text my-3">
                  {money(p.price)}<span className="text-sm font-medium text-text-secondary">/mo</span>
                </p>
                <ul className="space-y-2 text-sm text-text-secondary flex-1 mb-5">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onChangePlan(p.id)}
                  disabled={isCurrent || busy === 'plan'}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    p.id === 'gold'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-white hover:brightness-110'
                      : p.id === 'plus'
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-gray-100 text-text hover:bg-gray-200'
                  }`}
                >
                  {isCurrent ? 'Your plan' : p.id === 'free' ? 'Downgrade' : `Switch to ${p.label}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Boosts */}
        <h2 className="text-xl font-bold text-text mb-1">Profile boosts</h2>
        <p className="text-text-secondary text-sm mb-4">Push your profile to the top of discovery for a fixed window.</p>

        {boosts.active.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {boosts.active.map((b) => (
              <span key={b.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <Zap size={14} /> {b.label} • {b.multiplier}x • until {dateLabel(b.ends_at)}
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {(pricing?.boosts || []).map((b) => {
            const BIcon = BOOST_ICONS[b.id] || Zap;
            return (
              <div key={b.id} className="card">
                <div className="flex items-center gap-2 mb-1">
                  <BIcon size={20} className="text-amber-500" />
                  <h3 className="font-bold text-text">{b.label}</h3>
                </div>
                <p className="text-text-secondary text-xs mb-3">{b.note} • {b.duration_hours}h</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text">
                    {b.included ? <span className="text-green-600 text-sm">Included</span> : money(b.price)}
                  </span>
                  <button
                    onClick={() => onBoost(b.id)}
                    disabled={busy === `boost-${b.id}`}
                    className="btn btn-primary text-sm py-1.5"
                  >
                    {busy === `boost-${b.id}` ? 'Starting' : b.included ? 'Use boost' : 'Buy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Super likes */}
        <div className="grid gap-5 lg:grid-cols-2 mb-10">
          <section className="card">
            <div className="flex items-center gap-2 mb-3">
              <HeartFilled size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-text">Super Likes sent</h2>
              <span className="ml-auto text-sm text-text-secondary">{money(pricing?.superLike?.cost)} each</span>
            </div>
            {superLikes.sent.length === 0 ? (
              <p className="text-sm text-text-secondary py-6 text-center">No Super Likes sent yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {superLikes.sent.map((s) => (
                  <li key={s.id} className="py-2.5 flex items-center gap-3">
                    {s.photo ? <img src={s.photo} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-primary-100" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{s.to}</p>
                      <p className="text-xs text-text-secondary">{dateLabel(s.at)}</p>
                    </div>
                    <span className="ml-auto text-xs font-bold text-text-secondary">
                      {s.cost > 0 ? `-${money(s.cost)}` : 'Plan'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="flex items-center gap-2 mb-3">
              <HeartFilled size={20} className="text-secondary" />
              <h2 className="text-lg font-bold text-text">Super Likes received</h2>
              <span className="ml-auto text-sm text-text-secondary">{superLikes.received.length} total</span>
            </div>
            {superLikes.received.length === 0 ? (
              <p className="text-sm text-text-secondary py-6 text-center">Nobody has Super Liked you yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {superLikes.received.map((s) => (
                  <li key={s.id} className="py-2.5 flex items-center gap-3">
                    {s.photo ? <img src={s.photo} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-secondary/20" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{s.from}</p>
                      {s.message && <p className="text-xs text-text-secondary truncate">“{s.message}”</p>}
                    </div>
                    <span className="ml-auto text-xs text-text-secondary">{dateLabel(s.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* History */}
        <h2 className="text-xl font-bold text-text mb-4">Transaction history</h2>
        {transactions.length === 0 ? (
          <div className="card text-center py-14">
            <Clock size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-text">No transactions yet</p>
            <p className="text-sm text-text-secondary mt-1">Upgrades, boosts and Super Likes all appear here.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-text font-medium">{tx.description || 'Payment'}</td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{tx.payment_method}</td>
                    <td className="px-4 py-3 text-right font-bold text-text">{money(tx.amount)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{dateLabel(tx.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="flex items-center justify-center gap-2 mt-8 text-xs text-text-secondary">
          <TrendingUp size={14} /> All charges are recorded against your wallet and shown in your history.
        </p>
      </div>
    </div>
  );
};

export default TransactionsPage;