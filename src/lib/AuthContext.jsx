import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    api.auth.me().then((u) => {
      setUser(u);
      setIsLoadingAuth(false);
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await api.auth.login(email, password);
    setUser(u);
    return u;
  }, []);

  const confirmSignup = useCallback(async (email, code) => {
    const u = await api.auth.confirmSignup(email, code);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    api.auth.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingAuth, login, confirmSignup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
