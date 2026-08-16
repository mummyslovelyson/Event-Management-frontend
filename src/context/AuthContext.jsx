import { createContext, useContext, useState } from 'react';
import { loginUser, loginAdmin, logoutUser } from '@/api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('tc_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('tc_token'));
  const [loading, setLoading] = useState(false);

  const login = async (email, password, website = '') => {
    setLoading(true);
    try {
      const res = await loginUser({ email, password, website });
      const t = res.data.accessToken || res.data.token;
      const u = res.data.user;
      localStorage.setItem('tc_token', t);
      localStorage.setItem('tc_user', JSON.stringify(u));
      setToken(t);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (email, password, website = '') => {
    setLoading(true);
    try {
      const res = await loginAdmin({ email, password, website });
      const t = res.data.accessToken || res.data.token;
      const u = res.data.user;
      localStorage.setItem('tc_token', t);
      localStorage.setItem('tc_user', JSON.stringify(u));
      setToken(t);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch {
      // Token may already be invalid — proceed with local cleanup
    }
    localStorage.removeItem('tc_token');
    localStorage.removeItem('tc_user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.role === 'organizer';
  const isAttendee = user?.role === 'attendee';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, adminLogin, logout, isAuthenticated, isAdmin, isOrganizer, isAttendee, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
