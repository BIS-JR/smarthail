import { useState } from 'react';
import { Clock } from 'lucide-react';
import moment from 'moment';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { severityConfig, alertTypeLabels } from '@/lib/labels';
import { LoadingBlock } from '@/components/ui/spinner';
import PanelLink, { PanelTitle } from './PanelLink';

const module = getModule('alerts');

const filterOptions = [
  { label: '1h', value: 1 },
  { label: '1d', value: 24 },
  { label: '2d', value: 48 },
  { label: '1sem', value: 168 },
  { label: '1mês', value: 720 },
];

export default function AlertsPanel() {
  const { data: alerts, loading } = useEntityList('ClimateAlert', '-timestamp', 50);
  const [filter, setFilter] = useState(720);

  const cutoff = moment().subtract(filter, 'hours');
  const filtered = alerts.filter((a) => moment(a.timestamp).isAfter(cutoff)).slice(0, 3);

  return (
    <div className="space-y-4">
      <PanelTitle module={module}>Últimos alertas na sua região</PanelTitle>

      <div className="flex gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              filter === f.value ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock className="py-8" spinner={module.spinner} />
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">Nenhum alerta no período selecionado</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => {
            const sev = severityConfig[alert.severity] ?? severityConfig.low;
            return (
              <div key={alert.id} className={`rounded-xl border p-3 transition-all ${sev.card}`}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs">{alertTypeLabels[alert.type]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${sev.badge}`}>{sev.label}</span>
                  {alert.is_active && <span className={`ml-auto h-2 w-2 animate-pulse rounded-full ${sev.dot}`} />}
                </div>
                <p className="text-sm font-semibold text-white">{alert.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{alert.description}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{moment(alert.timestamp).format('DD/MM HH:mm')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PanelLink module={module}>Ver todos os alertas</PanelLink>
    </div>
  );
}
