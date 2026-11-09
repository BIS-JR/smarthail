import { useState } from 'react';
import moment from 'moment';
import { Clock, MapPin, BellOff } from 'lucide-react';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { severityConfig, alertTypeLabels } from '@/lib/labels';
import { LoadingBlock } from '@/components/ui/spinner';
import PageHeader from '@/components/smarthail/PageHeader';

const module = getModule('alerts');
const LIMITS = [10, 20, 50];

export default function AlertsList() {
  const [limit, setLimit] = useState(20);
  const { data: alerts, loading } = useEntityList('ClimateAlert', '-timestamp', limit);
  const activeCount = alerts.filter((a) => a.is_active).length;

  const limitSelector = (
    <select
      value={limit}
      onChange={(e) => setLimit(Number(e.target.value))}
      aria-label="Quantidade de alertas"
      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500"
    >
      {LIMITS.map((l) => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
    </select>
  );

  return (
    <div>
      <PageHeader
        module={module}
        subtitle={activeCount > 0 ? `${activeCount} alerta(s) ativo(s)` : 'Nenhum alerta ativo'}
        actions={limitSelector}
      />

      {loading ? (
        <LoadingBlock spinner={module.spinner} />
      ) : alerts.length === 0 ? (
        <div className="py-16 text-center">
          <BellOff className="mx-auto mb-3 h-12 w-12 text-slate-600" />
          <p className="text-sm text-slate-400">Nenhum alerta registrado</p>
          <p className="mt-1 text-xs text-slate-600">Sem eventos extremos previstos ou observados na sua região.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const sev = severityConfig[alert.severity] ?? severityConfig.low;
            return (
              <div key={alert.id} className={`rounded-2xl border p-4 ${sev.card}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs text-slate-200">{alertTypeLabels[alert.type]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${sev.badge}`}>{sev.label}</span>
                  {alert.is_active && (
                    <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold uppercase text-slate-300">
                      <span className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${sev.dot}`} />
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${sev.dot}`} />
                      </span>
                      Ativo
                    </span>
                  )}
                </div>
                <p className="font-semibold text-white">{alert.title}</p>
                <p className="mt-1 text-sm text-slate-300">{alert.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{moment(alert.timestamp).format('DD/MM/YYYY HH:mm')}</span>
                  {alert.location_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{alert.location_name}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
