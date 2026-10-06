import { useState, useEffect, useCallback } from 'react';
import { admin } from '../services/api';
import {
  Shield, BarChart, Flag, Ticket, Users, DollarSign, Database,
  CheckCircle, XCircle, Clock, TrendingUp, Download
} from '../components/Icons';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const shortDate = (d) =>
  d ? new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart },
  { id: 'moderation', label: 'Moderation', icon: Flag },
  { id: 'tickets', label: 'Support', icon: Ticket },
  { id: 'subscribers', label: 'Subscribers', icon: Users },
  { id: 'transactions', label: 'Payments', icon: DollarSign }
];

const SEVERITY_STYLES = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-blue-50 text-blue-700 border-blue-200'
};

const STATUS_STYLES = {
  active: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  reviewing: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
  actioned: 'bg-purple-50 text-purple-700',
  open: 'bg-amber-50 text-amber-700',
  closed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-600',
  completed: 'bg-green-50 text-green-700'
};

const Pill = ({ value }) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${STATUS_STYLES[value] || 'bg-gray-100 text-gray-600'}`}>
    {value}
  </span>
);

function Kpi({ icon: Icon, label, value, sub, tone = 'text-primary' }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className={tone} />
        <p className="text-xs uppercase tracking-wide text-text-secondary font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
    </div>
  );
}

const AdminPage = () => {
  const [tab, setTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportFilter, setReportFilter] = useState('pending');
  const [tickets, setTickets] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [transactionsList, setTransactionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);

  const loadOverview = useCallback(async () => {
    setAnalytics(await admin.analytics());
  }, []);

  const loadReports = useCallback(async (status) => {
    const res = await admin.reports(status);
    setReports(res.reports || []);
  }, []);

  const loadTickets = useCallback(async () => {
    const res = await admin.tickets();
    setTickets(res.tickets || []);
  }, []);

  const loadSubscribers = useCallback(async () => {
    const res = await admin.subscribers();
    setSubscribers(res.subscribers || []);
  }, []);

  const loadPayments = useCallback(async () => {
    const res = await admin.transactions();
    setTransactionsList(res.transactions || []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Promise.all([loadOverview(), loadReports(reportFilter), loadTickets(), loadSubscribers(), loadPayments()]);
      } catch (err) {
        if (alive) setError(err.response?.data?.message || 'Could not load the admin console');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeReportFilter = async (status) => {
    setReportFilter(status);
    try {
      await loadReports(status);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not filter reports');
    }
  };

  const act = async (key, fn, successMsg) => {
    setBusy(key);
    setError(null);
    try {
      const res = await fn();
      setToast(res?.message || successMsg);
      await Promise.all([loadOverview(), loadReports(reportFilter), loadTickets()]);
      return res;
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
      return null;
    } finally {
      setBusy(null);
    }
  };

  const downloadCsv = (rows, name, columns) => {
    const header = columns.map((c) => c.label).join(',');
    const body = rows
      .map((r) => columns.map((c) => `"${String(c.get(r) ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-28 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="min-h-screen py-16 px-4">
        <div className="max-w-md mx-auto card text-center">
          <Shield size={44} className="mx-auto text-red-400 mb-3" />
          <h1 className="text-xl font-bold text-text mb-2">Admin access denied</h1>
          <p className="text-text-secondary text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const o = analytics?.overview || {};
  const peak = Math.max(1, ...(analytics?.revenue?.byDay || []).map((d) => d.revenue));

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text flex items-center gap-2">
              <Shield size={28} className="text-primary" /> Admin Console
            </h1>
            <p className="text-text-secondary mt-1">Revenue, moderation and member operations.</p>
          </div>
          <button
            onClick={() => act('sweep', admin.maintenance, 'Maintenance run complete.')}
            disabled={busy === 'sweep'}
            className="btn btn-ghost border border-border text-sm"
          >
            <Database size={16} className="mr-2" />
            {busy === 'sweep' ? 'Running' : 'Run maintenance'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 border border-red-200 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-sm mb-5">
            <XCircle size={18} /> {error}
          </div>
        )}
        {toast && (
          <div className="flex items-center gap-2 border border-green-200 bg-green-50 text-green-800 rounded-xl px-4 py-3 text-sm mb-5">
            <CheckCircle size={18} /> {toast}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text'
              }`}
            >
              <Icon size={16} /> {label}
              {id === 'moderation' && analytics?.operations?.reports?.pending > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {analytics.operations.reports.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ---------------- Overview ---------------- */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={DollarSign} label="MRR" value={money(o.mrr)} sub={`${o.activeSubscriptions} active plans`} />
              <Kpi icon={TrendingUp} label="Gross revenue" value={money(o.grossRevenue)} sub={`${o.transactions} completed payments`} />
              <Kpi icon={Users} label="Total members" value={o.users} sub={`${o.humanProfiles} human • ${o.botProfiles} bot profiles`} />
              <Kpi icon={BarChart} label="Unlocks" value={o.unlocks} sub={`avg profile age ${o.averageAge}`} />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <div className="card lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-text">Revenue, last 14 days</h2>
                  <span className="text-xs text-text-secondary">peak {money(peak)}</span>
                </div>
                <div className="flex items-end gap-1.5 h-40">
                  {(analytics?.revenue?.byDay || []).map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${money(d.revenue)}`}>
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-primary to-secondary hover:opacity-80 transition-opacity"
                        style={{ height: `${Math.max(3, (d.revenue / peak) * 140)}px` }}
                      />
                      <span className="text-[9px] text-text-secondary">{String(d.day).slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="font-bold text-text mb-4">Revenue mix</h2>
                <ul className="space-y-3 text-sm">
                  {(analytics?.revenue?.byMethod || []).map((m) => {
                    const total = analytics.revenue.total || 1;
                    const pct = Math.round((m.revenue / total) * 100);
                    return (
                      <li key={m.payment_method}>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium capitalize text-text">{m.payment_method}</span>
                          <span className="text-text-secondary">{money(m.revenue)} • {pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <h3 className="font-bold text-text mt-5 mb-2">Plans</h3>
                <ul className="space-y-1.5 text-sm">
                  {Object.entries(analytics?.subscriptions?.byPlan || {}).map(([plan, n]) => (
                    <li key={plan} className="flex justify-between">
                      <span className="capitalize text-text">{plan}</span>
                      <span className="font-bold text-text">{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="card">
                <h2 className="font-bold text-text mb-3">Needs attention</h2>
                <ul className="space-y-2 text-sm">
                  {[
                    { label: 'Pending reports', value: analytics?.operations?.reports?.pending || 0, tone: 'text-red-600' },
                    { label: 'Open tickets', value: analytics?.operations?.tickets?.open || 0, tone: 'text-amber-600' },
                    { label: 'Active boosts', value: analytics?.engagement?.activeBoosts || 0, tone: 'text-primary' },
                    { label: 'Super Likes sent', value: analytics?.engagement?.superLikes || 0, tone: 'text-secondary' }
                  ].map((row) => (
                    <li key={row.label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-text-secondary">{row.label}</span>
                      <span className={`font-bold ${row.value > 0 ? row.tone : 'text-text-secondary'}`}>{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card">
                <h2 className="font-bold text-text mb-3">Admin audit trail</h2>
                {(analytics?.operations?.audit || []).length === 0 ? (
                  <p className="text-sm text-text-secondary py-6 text-center">No admin actions recorded yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
                    {analytics.operations.audit.map((a) => (
                      <li key={a.id} className="flex items-start gap-2">
                        <Clock size={14} className="text-text-secondary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-text">{a.action}</p>
                          <p className="text-xs text-text-secondary">
                            {a.admin_name || 'Admin'} • {shortDate(a.created_at)}
                            {a.entity ? ` • ${a.entity} #${a.entity_id ?? ''}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Moderation ---------------- */}
        {tab === 'moderation' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {['pending', 'reviewing', 'resolved', 'dismissed', ''].map((s) => (
                <button
                  key={s || 'all'}
                  onClick={() => changeReportFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                    reportFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  {s || 'all'}
                </button>
              ))}
              <button
                onClick={() => downloadCsv(reports, 'moderation-reports.csv', [
                  { label: 'id', get: (r) => r.id },
                  { label: 'severity', get: (r) => r.severity },
                  { label: 'status', get: (r) => r.status },
                  { label: 'reporter', get: (r) => r.reporter },
                  { label: 'reason', get: (r) => r.reason },
                  { label: 'created_at', get: (r) => r.created_at }
                ])}
                className="ml-auto btn btn-ghost border border-border text-xs"
              >
                <Download size={14} className="mr-1.5" /> Export CSV
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="card text-center py-14">
                <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
                <p className="font-semibold text-text">Queue is clear</p>
                <p className="text-sm text-text-secondary mt-1">No {reportFilter || ''} reports right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="card">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex-1 min-w-[240px]">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-text">#{r.id} {r.subject_type.replace(/_/g, ' ')}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.Low}`}>
                            {r.severity}
                          </span>
                          <Pill value={r.status} />
                        </div>
                        <p className="text-sm font-medium text-text">{r.reason}</p>
                        {r.details && <p className="text-sm text-text-secondary mt-1">{r.details}</p>}
                        <p className="text-xs text-text-secondary mt-2">Reported by {r.reporter} • {shortDate(r.created_at)}</p>
                        {r.moderator_note && <p className="text-xs text-text-secondary mt-1">Note: {r.moderator_note}</p>}
                      </div>
                      <div className="flex gap-2">
                        {r.status !== 'resolved' && (
                          <button
                            onClick={() => act(`report-${r.id}`, () => admin.resolveReport(r.id, 'resolved', 'Reviewed by moderator'), 'Report resolved')}
                            disabled={busy === `report-${r.id}`}
                            className="btn btn-primary text-xs"
                          >
                            <CheckCircle size={14} className="mr-1" /> Resolve
                          </button>
                        )}
                        {r.status === 'pending' && (
                          <button
                            onClick={() => act(`review-${r.id}`, () => admin.resolveReport(r.id, 'reviewing', 'Picked up'), 'Marked reviewing')}
                            disabled={busy === `review-${r.id}`}
                            className="btn btn-ghost border border-border text-xs"
                          >
                            Review
                          </button>
                        )}
                        {r.status !== 'dismissed' && (
                          <button
                            onClick={() => act(`dismiss-${r.id}`, () => admin.resolveReport(r.id, 'dismissed', 'No violation found'), 'Report dismissed')}
                            disabled={busy === `dismiss-${r.id}`}
                            className="btn btn-ghost border border-border text-xs"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------- Support ---------------- */}
        {tab === 'tickets' && (
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="card text-center py-14">
                <Ticket size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="font-semibold text-text">No support tickets</p>
              </div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="card">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-text">#{t.id} {t.subject}</span>
                        <Pill value={t.status} />
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-text-secondary capitalize">{t.priority}</span>
                      </div>
                      <p className="text-sm text-text-secondary">{t.body}</p>
                      <p className="text-xs text-text-secondary mt-2">{t.user} • {t.email} • {shortDate(t.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      {['open', 'pending', 'resolved', 'closed']
                        .filter((s) => s !== t.status)
                        .map((s) => (
                          <button
                            key={s}
                            onClick={() => act(`ticket-${t.id}-${s}`, () => admin.updateTicket(t.id, s), `Ticket #${t.id} ${s}`)}
                            disabled={busy === `ticket-${t.id}-${s}`}
                            className="btn btn-ghost border border-border text-xs capitalize"
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ---------------- Subscribers ---------------- */}
        {tab === 'subscribers' && (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold text-right">Monthly</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Renews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text">{s.user}</p>
                      <p className="text-xs text-text-secondary">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-text">{s.plan}</td>
                    <td className="px-4 py-3 text-right text-text">{money(s.monthly_price)}</td>
                    <td className="px-4 py-3"><Pill value={s.status} /></td>
                    <td className="px-4 py-3 text-text-secondary">{shortDate(s.renews_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---------------- Payments ---------------- */}
        {tab === 'transactions' && (
          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-bold text-text">All payments</h2>
              <button
                onClick={() => downloadCsv(transactionsList, 'transactions.csv', [
                  { label: 'id', get: (t) => t.id },
                  { label: 'user', get: (t) => t.user },
                  { label: 'email', get: (t) => t.email },
                  { label: 'description', get: (t) => t.description },
                  { label: 'method', get: (t) => t.method },
                  { label: 'amount', get: (t) => t.amount },
                  { label: 'status', get: (t) => t.status },
                  { label: 'ref', get: (t) => t.ref },
                  { label: 'at', get: (t) => t.at }
                ])}
                className="btn btn-ghost border border-border text-xs"
              >
                <Download size={14} className="mr-1.5" /> Export CSV
              </button>
            </div>
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactionsList.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-text">{t.user}</p>
                      <p className="text-xs text-text-secondary">{t.email}</p>
                    </td>
                    <td className="px-4 py-3 text-text">{t.description}</td>
                    <td className="px-4 py-3 capitalize text-text-secondary">{t.method}</td>
                    <td className="px-4 py-3 text-right font-bold text-text">{money(t.amount)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-text-secondary">{t.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;