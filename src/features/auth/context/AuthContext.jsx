import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext.js';
import { getAuthenticatedUser, login as loginWithCookie, logout as logoutWithCookie } from '../services/authService.js';

function clearLegacyAuthStorage() {
  localStorage.removeItem('growcap_token');
  localStorage.removeItem('growcap_user');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);

    try {
      const authenticatedUser = await getAuthenticatedUser();
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (error) {
      if (error?.response?.status === 401) {
        setUser(null);
        return null;
      }

      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await loginWithCookie(credentials);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutWithCookie();
    } finally {
      clearLegacyAuthStorage();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    clearLegacyAuthStorage();
    refreshUser().catch(() => undefined);
  }, [refreshUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('growcap:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('growcap:unauthorized', handleUnauthorized);
    };
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refreshUser,
      user,
    }),
    [isLoading, login, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
