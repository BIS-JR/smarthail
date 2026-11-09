import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';

const ClimateContext = createContext(null);

/**
 * Dispara a sincronização climática quando o usuário entra no app e expõe
 * `version`, que as páginas usam como dependência para recarregar os dados.
 */
export function ClimateProvider({ children }) {
  const { user } = useAuth();
  // Define o dono dos metadados de sincronização antes de lê-los (idempotente)
  api.climate.setUser(user?.id ?? null);

  const [syncing, setSyncing] = useState(false);
  const [meta, setMeta] = useState(() => api.climate.meta());
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async (force = false) => {
    setSyncing(true);
    setError(null);
    try {
      const m = await api.climate.sync({ force });
      setMeta(m);
      setVersion((v) => v + 1);
      if (force) toast.success('Dados climáticos atualizados', { description: m.location.name });
    } catch (e) {
      console.error(e);
      setError(e.message);
      toast.error('Não foi possível atualizar o clima', { description: 'Verifique sua conexão com a internet.' });
    } finally {
      setSyncing(false);
    }
  }, []);

  /** Força recarga das telas após alterações locais (ex.: dados de demonstração). */
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    refresh(false);
    const timer = setInterval(() => refresh(false), 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <ClimateContext.Provider value={{ syncing, meta, error, version, refresh, bump }}>
      {children}
    </ClimateContext.Provider>
  );
}

export function useClimate() {
  const ctx = useContext(ClimateContext);
  if (!ctx) throw new Error('useClimate deve ser usado dentro de ClimateProvider');
  return ctx;
}
