import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useClimate } from '@/lib/ClimateContext';

/** Estado e ações das notificações push deste aparelho. */
export function usePush() {
  const { meta } = useClimate();
  const [status, setStatus] = useState('unavailable');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => api.push.status().then(setStatus), []);
  useEffect(() => { reload(); }, [reload]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      await api.push.enable(meta?.location);
      toast.success('Notificações ativadas', { description: 'Você receberá alertas de risco alto mesmo com o app fechado.' });
    } catch (e) {
      toast.error('Não foi possível ativar as notificações', { description: e.message });
    } finally {
      setBusy(false);
      reload();
    }
  }, [meta, reload]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await api.push.disable();
      toast.success('Notificações desativadas neste aparelho');
    } finally {
      setBusy(false);
      reload();
    }
  }, [reload]);

  return { status, busy, enable, disable, needsInstall: api.push.needsInstall() };
}
