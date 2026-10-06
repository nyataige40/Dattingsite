import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import CataloguePage from './pages/CataloguePage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import TransactionsPage from './pages/TransactionsPage';
import AdminPage from './pages/AdminPage';

// Components
import Navbar from './components/Navbar';

function App() {
  const { user, loading, profile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const requireAuth = (element) => {
    return user ? element : <Navigate to="/login" replace />;
  };

  const requireProfile = (element) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!profile) return <Navigate to="/onboarding" replace />;
    return element;
  };

  // The API re-checks is_admin on every request, so this is only a UX guard
  const isAdmin = user?.is_admin === 1 || user?.is_admin === true;
  const requireAdmin = (element) => {
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
    return element;
  };

  // Admins run the console rather than dating, so the seed leaves them without
  // a profile. Requiring one would strand them on /onboarding with no way out.
  const landing = user ? (profile ? '/dashboard' : isAdmin ? '/admin' : '/onboarding') : '/login';

  return (
    <>
      {user && (profile || isAdmin) && location.pathname !== '/onboarding' && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to={landing} replace />} />
        <Route path="/login" element={user ? <Navigate to={landing} replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to={landing} replace /> : <RegisterPage />} />
        <Route path="/onboarding" element={requireAuth(<OnboardingPage />)} />
        <Route path="/dashboard" element={requireProfile(<DashboardPage />)} />
        <Route path="/catalogue" element={requireProfile(<CataloguePage />)} />
        <Route path="/chat/:partnerId" element={requireProfile(<ChatPage />)} />
        <Route path="/profile" element={requireProfile(<ProfilePage />)} />
        <Route path="/transactions" element={requireProfile(<TransactionsPage />)} />
        <Route path="/admin" element={requireAdmin(<AdminPage />)} />
      </Routes>
    </>
  );
}

export default App;
