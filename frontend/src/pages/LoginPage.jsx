import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, GoogleIcon, FacebookIcon, Eye, EyeOff } from '../components/Icons';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, socialLogin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      // Let the root route pick the landing page: a member with a profile goes
      // to the dashboard, a new member to onboarding, an admin to the console.
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    // In production, this redirects to the OAuth provider
    // For demo, simulate with mock provider IDs
    const mockEmails = {
      google: 'google_user@dattingsite.com',
      facebook: 'facebook_user@dattingsite.com'
    };
    const mockIds = {
      google: `google_${Date.now()}`,
      facebook: `fb_${Date.now()}`
    };

    socialLogin(mockEmails[provider], `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`, provider, mockIds[provider])
      .then(() => navigate('/onboarding'))
      .catch(err => setError(err.response?.data?.message || 'Social login failed'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-secondary">Dattingsite</h1>
          <p className="text-text-secondary mt-2">Welcome back. Sign in to continue.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-text-secondary">Or continue with</span></div>
        </div>

        <div className="space-y-3">
          <button onClick={() => handleSocialLogin('google')} className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 hover:bg-gray-50 transition-colors">
            <GoogleIcon />
            <span className="font-medium">Continue with Google</span>
          </button>
          <button onClick={() => handleSocialLogin('facebook')} className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 hover:bg-gray-50 transition-colors">
            <FacebookIcon />
            <span className="font-medium">Continue with Facebook</span>
          </button>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          New to Dattingsite? <Link to="/register" className="text-primary font-medium hover:underline">Create an account</Link>
        </p>

        <p className="text-center text-xs text-text-secondary mt-4">
          Demo credentials: demo@example.com / password123
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
