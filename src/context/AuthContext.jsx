import { createContext, useContext, useState, useCallback } from 'react';
import {
  loginUser, loginAdmin, logoutUser, changePassword as apiChangePassword,
  getSessions as apiGetSessions, revokeSession as apiRevokeSession,
  logoutAll as apiLogoutAll,
} from '@/api/auth';
import { getProfile } from '@/api/users';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('tc_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('tc_token'));
  const [loading, setLoading] = useState(false);

  const persistAuth = useCallback((accessToken, refreshToken, userData) => {
    localStorage.setItem('tc_token', accessToken);
    localStorage.setItem('tc_refresh', refreshToken);
    localStorage.setItem('tc_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('tc_token');
    localStorage.removeItem('tc_refresh');
    localStorage.removeItem('tc_user');
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      if (res.data?.user) {
        setUser((prev) => {
          const updated = { ...prev, ...res.data.user };
          localStorage.setItem('tc_user', JSON.stringify(updated));
          return updated;
        });
        return res.data.user;
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err.message);
    }
    return null;
  }, []);

  const login = async (email, password, website = '') => {
    setLoading(true);
    try {
      const res = await loginUser({ email, password, website });
      persistAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
      return res.data.user;
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (email, password, website = '') => {
    setLoading(true);
    try {
      const res = await loginAdmin({ email, password, website });
      persistAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
      return res.data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('tc_refresh');
      await logoutUser(refreshToken);
    } catch { /* token may already be invalid */ }
    clearAuth();
  };

  const logoutAll = async () => {
    try {
      await apiLogoutAll();
    } catch { /* proceed with local cleanup */ }
    clearAuth();
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await apiChangePassword({ currentPassword, newPassword });
    // If backend returns a new refresh token (other sessions revoked), update it
    if (res.data.refreshToken) {
      const refreshToken = localStorage.getItem('tc_refresh');
      localStorage.setItem('tc_refresh', res.data.refreshToken);
    }
    return res.data;
  };

  const getSessions = async () => {
    const res = await apiGetSessions();
    return res.data.sessions;
  };

  const revokeSession = async (sessionId) => {
    const res = await apiRevokeSession(sessionId);
    return res.data;
  };

  const isAuthenticated = !!token && !!user;
  const isSystemAdmin = user?.role === 'system_admin' || user?.role === 'superadmin';
  const isAdmin = isSystemAdmin || user?.role === 'admin' || user?.role === 'staff';
  const isStaffAdmin = user?.role === 'admin' || user?.role === 'staff';
  const isOrganizer = user?.role === 'organizer';
  const isAttendee = user?.role === 'attendee';

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, adminLogin, logout, logoutAll,
      changePassword, getSessions, revokeSession, refreshProfile,
      isAuthenticated, isSystemAdmin, isAdmin, isStaffAdmin, isOrganizer, isAttendee, setUser,
      persistAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      token: null,
      loading: false,
      isAuthenticated: false,
      isAdmin: false,
      isOrganizer: false,
      isAttendee: false,
      login: async () => {},
      adminLogin: async () => {},
      logout: async () => {},
      logoutAll: async () => {},
      changePassword: async () => {},
      getSessions: async () => [],
      revokeSession: async () => {},
      refreshProfile: async () => null,
      setUser: () => {},
      persistAuth: () => {},
    };
  }
  return context;
};
