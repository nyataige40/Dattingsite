import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 10000
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

const unwrap = (promise) => promise.then((res) => res.data);

/* ---------------------------------------------------------------------- */
/* Layer 4: monetization                                                   */
/* ---------------------------------------------------------------------- */
export const billing = {
  plans: () => unwrap(api.get('/api/billing/plans')),
  pricing: () => unwrap(api.get('/api/billing/pricing')),
  subscription: () => unwrap(api.get('/api/billing/subscription')),
  subscribe: (plan, payment_method = 'wallet') =>
    unwrap(api.post('/api/billing/subscription', { plan, payment_method })),
  changePlan: (plan, payment_method = 'wallet') =>
    unwrap(api.put('/api/billing/subscription', { plan, payment_method })),
  cancelSubscription: () => unwrap(api.delete('/api/billing/subscription')),
  boosts: () => unwrap(api.get('/api/billing/boosts')),
  startBoost: (type, payment_method = 'wallet') =>
    unwrap(api.post('/api/billing/boosts', { type, payment_method })),
  superLikes: () => unwrap(api.get('/api/billing/superlikes')),
  sendSuperLike: (profile_id, message = null, payment_method = 'wallet') =>
    unwrap(api.post('/api/billing/superlikes', { profile_id, message, payment_method }))
};

/* ---------------------------------------------------------------------- */
/* Layer 4: admin console (every call requires the is_admin flag)          */
/* ---------------------------------------------------------------------- */
export const admin = {
  analytics: () => unwrap(api.get('/api/admin/analytics')),
  reports: (status) => unwrap(api.get('/api/admin/reports', { params: { status } })),
  resolveReport: (id, status, note) =>
    unwrap(api.put(`/api/admin/reports/${id}`, { status, note })),
  tickets: (status) => unwrap(api.get('/api/admin/tickets', { params: { status } })),
  updateTicket: (id, status) => unwrap(api.put(`/api/admin/tickets/${id}`, { status })),
  subscribers: () => unwrap(api.get('/api/admin/subscribers')),
  transactions: () => unwrap(api.get('/api/admin/transactions')),
  maintenance: () => unwrap(api.post('/api/admin/maintenance'))
};

export default api;