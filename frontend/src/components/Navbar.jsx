import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, MessageCircle, User, LogOut } from '../components/Icons';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-border sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-secondary">Dattingsite</span>
          </Link>

          <div className="flex items-center space-x-1 sm:space-x-4">
            <Link
              to="/catalogue"
              className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive('/catalogue') ? 'bg-primary-50 text-primary' : 'text-text-secondary hover:bg-gray-50'}`}
            >
              <ShoppingBag size={18} />
              <span>Catalogue</span>
            </Link>
            <Link
              to="/profile"
              className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive('/profile') ? 'bg-primary-50 text-primary' : 'text-text-secondary hover:bg-gray-50'}`}
            >
              <User size={18} />
              <span>Profile</span>
            </Link>
            <Link
              to="/transactions"
              className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive('/transactions') ? 'bg-primary-50 text-primary' : 'text-text-secondary hover:bg-gray-50'}`}
            >
              <ShoppingBag size={18} />
              <span>Transactions</span>
            </Link>

            <div className="flex items-center space-x-3 pl-2 border-l border-border">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold">
                  {profile?.full_name?.[0] || user?.full_name?.[0] || '?'}
                </div>
              )}
              <span className="text-sm font-medium text-text max-w-[120px] truncate">{user?.full_name}</span>
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
