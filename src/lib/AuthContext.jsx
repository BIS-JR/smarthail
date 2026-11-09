import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let active = true;
    api.auth.me().then((u) => {
      if (!active) return;
      setUser(u);
      setIsLoadingAuth(false);
    });
    // Nuvem: acompanha login/logout/renovação de sessão (inclui link de e-mail e Google)
    const unsubscribe = api.auth.onChange((_event, u) => setUser(u));
    return () => { active = false; unsubscribe(); };
  }, []);

  /** Atualiza o usuário a partir da sessão atual (após cadastro/confirmação). */
  const refresh = useCallback(async () => {
    const u = await api.auth.me();
    setUser(u);
    return u;
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

  const logout = useCallback(async () => {
    await api.push.disable().catch(() => {}); // este aparelho deixa de receber alertas da conta
    await api.auth.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingAuth, login, confirmSignup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
