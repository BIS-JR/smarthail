import { useCallback, useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useClimate } from '@/lib/ClimateContext';

/**
 * Carrega uma lista de entidades e recarrega após cada sincronização climática.
 * Enquanto a primeira sincronização roda e não há dados, permanece em "carregando".
 */
export function useEntityList(entityName, sort, limit) {
  const { version, syncing } = useClimate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const rows = await api.entities[entityName].list(sort, limit);
      setData(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [entityName, sort, limit]);

  useEffect(() => {
    reload();
  }, [reload, version]);

  return { data, loading: loading || (syncing && data.length === 0), reload };
}
