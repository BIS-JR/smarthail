import moment from 'moment';
import { MapPin, RefreshCw } from 'lucide-react';
import { useClimate } from '@/lib/ClimateContext';

/** Linha com a localização monitorada, hora da última atualização e botão de atualizar. */
export default function SyncStatus() {
  const { meta, syncing, refresh } = useClimate();

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400" />
      <span className="min-w-0 flex-1 truncate text-slate-300">
        {meta?.location?.name ?? 'Obtendo localização…'}
        {meta && !meta.usedDeviceLocation && <span className="text-slate-500"> (padrão)</span>}
      </span>
      <span className="shrink-0 text-slate-500">
        {syncing ? 'Atualizando…' : meta ? `Atualizado ${moment(meta.at).fromNow()}` : ''}
      </span>
      <button
        onClick={() => refresh(true)}
        disabled={syncing}
        aria-label="Atualizar dados climáticos"
        className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
