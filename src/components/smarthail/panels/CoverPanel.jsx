import { useState } from 'react';
import { ShieldCheck, Zap, Magnet, Battery, Wind } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { magnetConfig, integrityConfig, batteryColor } from '@/lib/labels';
import { runCoverAction, coverToastTitles } from '@/lib/cover';
import { LoadingBlock, Spinner } from '@/components/ui/spinner';
import PanelLink, { PanelTitle } from './PanelLink';

const module = getModule('cover');

export default function CoverPanel() {
  const { data, loading, reload } = useEntityList('CoverStatus', '-timestamp', 1);
  const [running, setRunning] = useState(null);
  const status = data[0];

  const handleAction = async (action) => {
    setRunning(action);
    try {
      await runCoverAction(action, status);
      toast.success(coverToastTitles[action], { description: 'Comando executado com sucesso.' });
      await reload();
    } catch (e) {
      toast.error('Falha ao executar comando', { description: e.message });
    } finally {
      setRunning(null);
    }
  };

  if (loading) return <LoadingBlock spinner={module.spinner} />;

  const magnet = magnetConfig[status?.magnets_status] ?? magnetConfig.all_attached;
  const integrity = integrityConfig[status?.integrity] ?? integrityConfig.good;
  const battery = batteryColor(status?.battery_level);
  const inflated = Boolean(status?.is_inflated);

  return (
    <div className="space-y-4">
      <PanelTitle module={module}>Controle e monitoramento</PanelTitle>

      <div className="flex items-center justify-center gap-4">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full border-4 transition-all ${
            inflated ? 'border-green-400 bg-green-400/10 shadow-[0_0_30px_rgba(74,222,128,0.35)]' : 'border-slate-600 bg-slate-600/10'
          }`}
        >
          <ShieldCheck className={`h-8 w-8 ${inflated ? 'text-green-400' : 'text-slate-500'}`} />
        </div>
        <div>
          <p className={`text-lg font-bold ${inflated ? 'text-green-400' : 'text-slate-400'}`}>{inflated ? 'INFLADA' : 'DESINFLADA'}</p>
          <p className="text-xs text-slate-500">Status da capa</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleAction('inflate')}
          disabled={!!running || inflated}
          className="rounded-xl border border-green-500/20 bg-green-500/10 py-3 text-sm font-semibold text-green-400 transition-all hover:bg-green-500/20 disabled:opacity-40"
        >
          {running === 'inflate' ? <Spinner size="sm" className="mx-auto mb-1 border-green-400" /> : <Zap className="mx-auto mb-1 h-4 w-4" />}
          Inflar
        </button>
        <button
          onClick={() => handleAction('deflate')}
          disabled={!!running || !inflated}
          className="rounded-xl border border-slate-500/20 bg-slate-500/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-500/20 disabled:opacity-40"
        >
          {running === 'deflate' ? <Spinner size="sm" className="mx-auto mb-1 border-slate-300" /> : <Wind className="mx-auto mb-1 h-4 w-4" />}
          Desinflar
        </button>
      </div>

      <div className="space-y-2">
        {[
          { icon: Magnet, color: 'text-blue-400', label: 'Magnetos', value: magnet.label, valueClass: magnet.text },
          { icon: ShieldCheck, color: 'text-purple-400', label: 'Integridade', value: integrity.label, valueClass: integrity.text },
          { icon: Battery, color: 'text-yellow-400', label: 'Bateria', value: `${status?.battery_level ?? 0}%`, valueClass: battery.text },
        ].map(({ icon: Icon, color, label, value, valueClass }) => (
          <div key={label} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <span className={`text-xs font-bold ${valueClass}`}>{value}</span>
          </div>
        ))}
      </div>

      <PanelLink module={module}>Gerenciar automação</PanelLink>
    </div>
  );
}
