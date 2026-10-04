import { useState, useEffect } from 'react';
import api from '../services/api';
import { ShoppingBag } from '../components/Icons';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/api/catalogue/transactions');
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-6">Transaction History</h1>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-20 animate-pulse" />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-text">{tx.partner_name || `Partner #${tx.profile_id}`}</p>
                    <p className="text-sm text-text-secondary">
                      {tx.payment_method === 'wallet' ? 'Wallet' : tx.payment_method === 'stripe' ? 'Stripe' : 'PayPal'} • {tx.payment_status}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text">${tx.amount.toFixed(2)}</p>
                  <p className="text-xs text-text-secondary">{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 card">
            <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="font-semibold text-text mb-2">No transactions yet</h3>
            <p className="text-text-secondary">Unlock partners to see your transaction history here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
