import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      fetchProfile(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (authToken) => {
    try {
      const res = await api.get('/api/profile');
      setProfile(res.data.profile);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { token: authToken, user: userData } = res.data;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(userData);
    await fetchProfile(authToken);
    return userData;
  };

  const register = async (email, password, fullName) => {
    const res = await api.post('/api/auth/register', { email, password, full_name: fullName });
    const { token: authToken, user: userData } = res.data;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(userData);
    return userData;
  };

  const socialLogin = async (email, fullName, provider, providerId) => {
    const res = await api.post('/api/auth/social', { email, full_name: fullName, provider, provider_id: providerId });
    const { token: authToken, user: userData } = res.data;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const createProfile = async (profileData) => {
    const res = await api.post('/api/profile', profileData);
    setProfile(res.data.profile);
    return res.data.profile;
  };

  return (
    <AuthContext.Provider value={{
      user, token, profile, loading,
      login, register, socialLogin, logout, createProfile, setProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
