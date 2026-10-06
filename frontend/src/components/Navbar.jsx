import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBilling } from '../context/BillingContext';
import { ShoppingBag, MessageCircle, User, LogOut, Sparkles, Shield } from '../components/Icons';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const { plan } = useBilling();

  const isActive = (path) => location.pathname === path;

  const navClass = (path) =>
    `flex items-center space-x-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
      isActive(path) ? 'bg-primary-50 text-primary' : 'text-text-secondary hover:bg-gray-50'
    }`;

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-border sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-secondary">Dattingsite</span>
          </Link>

          <div className="flex items-center space-x-1 sm:space-x-4">
            <Link to="/catalogue" className={navClass('/catalogue')}>
              <ShoppingBag size={18} />
              <span className="hidden sm:inline">Catalogue</span>
            </Link>
            <Link to="/profile" className={navClass('/profile')}>
              <User size={18} />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <Link to="/transactions" className={navClass('/transactions')}>
              <ShoppingBag size={18} />
              <span className="hidden sm:inline">Billing</span>
            </Link>
            {user?.is_admin === 1 || user?.is_admin === true ? (
              <Link to="/admin" className={navClass('/admin')}>
                <Shield size={18} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            ) : null}

            <div className="flex items-center space-x-3 pl-2 border-l border-border">
              <button
                onClick={() => navigate('/transactions')}
                title="Change subscription plan"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-orange-600 to-primary-600 hover:brightness-110 transition-all"
              >
                <Sparkles size={14} />
                {plan?.label || 'Free'}
              </button>
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold">
                  {profile?.full_name?.[0] || user?.full_name?.[0] || '?'}
                </div>
              )}
              <span className="text-sm font-medium text-text max-w-[120px] truncate hidden md:inline">{user?.full_name}</span>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="p-2 text-text-secondary hover:text-primary rounded-lg hover:bg-gray-50 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
