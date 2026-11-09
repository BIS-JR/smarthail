import { useState } from 'react';
import moment from 'moment';
import { ShieldCheck, Zap, Wind, Search, Siren, Magnet, Battery, History } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { magnetConfig, integrityConfig, batteryColor, coverActionLabels } from '@/lib/labels';
import { runCoverAction, coverToastTitles } from '@/lib/cover';
import { LoadingBlock, Spinner } from '@/components/ui/spinner';
import PageHeader from '@/components/smarthail/PageHeader';

const module = getModule('cover');

function DiagnosticBar({ icon: Icon, iconColor, label, value, valueClass, pct, barClass }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-slate-300"><Icon className={`h-4 w-4 ${iconColor}`} />{label}</span>
        <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full transition-all duration-700 ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CoverAutomation() {
  const { data: history, loading, reload } = useEntityList('CoverStatus', '-timestamp', 11);
  const [running, setRunning] = useState(null);
  const status = history[0];
  const inflated = Boolean(status?.is_inflated);

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

  const actions = [
    { id: 'inflate', label: 'Inflar', icon: Zap, cls: 'border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20', spin: 'border-green-400', disabled: inflated },
    { id: 'deflate', label: 'Desinflar', icon: Wind, cls: 'border-slate-500/20 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20', spin: 'border-slate-300', disabled: !inflated },
    { id: 'check', label: 'Verificar', icon: Search, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20', spin: 'border-blue-400', disabled: false },
    { id: 'emergency_deploy', label: 'Emergência', icon: Siren, cls: 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20', spin: 'border-red-400', disabled: inflated },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader module={module} />
        <LoadingBlock spinner={module.spinner} />
      </div>
    );
  }

  const magnet = magnetConfig[status?.magnets_status] ?? magnetConfig.all_attached;
  const integrity = integrityConfig[status?.integrity] ?? integrityConfig.good;
  const batteryLevel = status?.battery_level ?? 0;
  const battery = batteryColor(batteryLevel);

  return (
    <div>
      <PageHeader module={module} subtitle="Controle e diagnóstico" />

      <div className="flex flex-col items-center py-4">
        <div
          className={`flex h-40 w-40 items-center justify-center rounded-full border-[6px] transition-all duration-500 ${
            inflated ? 'border-green-400 bg-green-400/10 shadow-[0_0_60px_rgba(74,222,128,0.35)]' : 'border-slate-700 bg-slate-700/10'
          }`}
        >
          <div className="text-center">
            <ShieldCheck className={`mx-auto h-12 w-12 ${inflated ? 'text-green-400' : 'text-slate-500'}`} />
            <p className={`mt-1 text-sm font-bold tracking-wider ${inflated ? 'text-green-400' : 'text-slate-400'}`}>
              {inflated ? 'INFLADA' : 'DESINFLADA'}
            </p>
          </div>
        </div>
        {status && (
          <p className="mt-3 text-xs text-slate-400">
            Última ação: <span className="text-white">{coverActionLabels[status.last_action] ?? '—'}</span> · {moment(status.timestamp).format('DD/MM HH:mm')}
          </p>
        )}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map(({ id, label, icon: Icon, cls, spin, disabled }) => (
          <button
            key={id}
            onClick={() => handleAction(id)}
            disabled={!!running || disabled}
            className={`rounded-xl border py-4 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 ${cls}`}
          >
            {running === id ? <Spinner size="sm" className={`mx-auto mb-1.5 ${spin}`} /> : <Icon className="mx-auto mb-1.5 h-5 w-5" />}
            {label}
          </button>
        ))}
      </div>

      <h2 className="mb-3 mt-6 text-sm font-semibold text-white">Diagnóstico</h2>
      <div className="space-y-2">
        <DiagnosticBar icon={Magnet} iconColor="text-blue-400" label="Magnetos" value={magnet.label} valueClass={magnet.text} pct={magnet.pct} barClass={magnet.bar} />
        <DiagnosticBar icon={ShieldCheck} iconColor="text-purple-400" label="Integridade" value={integrity.label} valueClass={integrity.text} pct={integrity.pct} barClass={integrity.bar} />
        <DiagnosticBar icon={Battery} iconColor="text-yellow-400" label="Bateria" value={`${batteryLevel}%`} valueClass={battery.text} pct={batteryLevel} barClass={battery.bar} />
      </div>

      <h2 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold text-white"><History className="h-4 w-4 text-cyan-400" />Histórico de ações</h2>
      {history.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma ação registrada.</p>
      ) : (
        <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/5">
          {history.slice(0, 10).map((h) => (
            <div key={h.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-white">{coverActionLabels[h.last_action] ?? '—'}</p>
                <p className="text-xs text-slate-500">{moment(h.timestamp).format('DD/MM/YYYY HH:mm:ss')}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold ${h.is_inflated ? 'text-green-400' : 'text-slate-400'}`}>
                  {h.is_inflated ? 'Inflada' : 'Desinflada'}
                </span>
                <p className="text-[11px] text-slate-500">Bateria {h.battery_level}%</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-center text-[11px] text-slate-600">
        Comandos simulados até a integração com o hardware da capa.
      </p>
    </div>
  );
}
