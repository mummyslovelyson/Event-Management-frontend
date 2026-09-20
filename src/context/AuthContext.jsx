import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  loginUser, loginAdmin, logoutUser, changePassword as apiChangePassword,
  getSessions as apiGetSessions, revokeSession as apiRevokeSession,
  logoutAll as apiLogoutAll, refreshToken as apiRefreshToken,
} from '@/api/auth';
import { getProfile } from '@/api/users';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Purge any legacy localStorage keys to ensure zero persistent local storage
  useEffect(() => {
    try {
      localStorage.removeItem('tc_token');
      localStorage.removeItem('tc_refresh');
      localStorage.removeItem('tc_user');
      localStorage.removeItem('tc_currency');
    } catch {
      // Ignore if localStorage is disabled or restricted
    }
  }, []);

  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('tc_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem('tc_token');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const persistAuth = useCallback((accessToken, refreshToken, userData) => {
    try {
      sessionStorage.setItem('tc_token', accessToken);
      sessionStorage.setItem('tc_refresh', refreshToken);
      sessionStorage.setItem('tc_user', JSON.stringify(userData));
    } catch {
      // Fail-safe if storage quota exceeded
    }
    setToken(accessToken);
    setUser(userData);
  }, []);

  const clearAuth = useCallback(() => {
    try {
      sessionStorage.removeItem('tc_token');
      sessionStorage.removeItem('tc_refresh');
      sessionStorage.removeItem('tc_user');
    } catch {
      // Fail-safe
    }
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      if (res.data?.user) {
        setUser((prev) => {
          const updated = { ...prev, ...res.data.user };
          try {
            sessionStorage.setItem('tc_user', JSON.stringify(updated));
          } catch { /* ignore */ }
          return updated;
        });
        return res.data.user;
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err.message);
    }
    return null;
  }, []);

  // Proactive token validation & refresh on application mount
  useEffect(() => {
    const validateInitialSession = async () => {
      const storedToken = sessionStorage.getItem('tc_token');
      const storedRefresh = sessionStorage.getItem('tc_refresh');
      if (!storedToken) return;

      try {
        // Inspect token expiration
        const parts = storedToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          // If expiring within 60 seconds or already expired, attempt silent rotation
          if (payload.exp && payload.exp * 1000 < Date.now() + 60000) {
            if (storedRefresh) {
              const res = await apiRefreshToken({ refreshToken: storedRefresh });
              if (res.data?.accessToken) {
                persistAuth(res.data.accessToken, res.data.refreshToken || storedRefresh, res.data.user || user);
                return;
              }
            } else {
              clearAuth();
              return;
            }
          }
        }
        await refreshProfile();
      } catch (err) {
        console.warn('Initial session validation notice:', err.message);
      }
    };

    validateInitialSession();
  }, [clearAuth, persistAuth, refreshProfile, user]);

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

  const loginWithOAuth = useCallback((accessToken, refreshToken, userData) => {
    persistAuth(accessToken, refreshToken, userData);
    return userData;
  }, [persistAuth]);

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
      const refreshToken = sessionStorage.getItem('tc_refresh');
      if (refreshToken) await logoutUser(refreshToken);
    } catch { /* token may already be invalid */ }
    clearAuth();
  };

  const logoutAll = async () => {
    try {
      await apiLogoutAll();
    } catch { /* proceed with session cleanup */ }
    clearAuth();
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await apiChangePassword({ currentPassword, newPassword });
    // If backend returns a new refresh token (other sessions revoked), update it
    if (res.data?.refreshToken) {
      try {
        sessionStorage.setItem('tc_refresh', res.data.refreshToken);
      } catch { /* ignore */ }
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
      login, loginWithOAuth, adminLogin, logout, logoutAll,
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
      loginWithOAuth: () => {},
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
