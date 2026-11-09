import { useState } from 'react';
import moment from 'moment';
import { TrendingUp, Gauge, CalendarClock, ShieldAlert, MapPin, ChevronDown } from 'lucide-react';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { riskLevelConfig, intensityLabels } from '@/lib/labels';
import { forecastTypeConfig } from '@/lib/forecast';
import { LoadingBlock } from '@/components/ui/spinner';
import PageHeader from '@/components/smarthail/PageHeader';

const module = getModule('forecast');

export default function ForecastDetail() {
  const { data: forecasts, loading } = useEntityList('RiskForecast', 'expected_start', 30);
  const [openId, setOpenId] = useState(null);

  return (
    <div>
      <PageHeader module={module} subtitle="Próximas 72 horas" />

      {loading ? (
        <LoadingBlock spinner={module.spinner} />
      ) : forecasts.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">Nenhuma previsão de risco</p>
      ) : (
        <div className="space-y-3">
          {forecasts.map((f) => {
            const config = forecastTypeConfig[f.type] ?? forecastTypeConfig.rain;
            const risk = riskLevelConfig[f.risk_level] ?? riskLevelConfig.low;
            const Icon = config.icon;
            const open = openId === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setOpenId(open ? null : f.id)}
                aria-expanded={open}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${config.bg} ${config.border} hover:brightness-110`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${config.bg}`}>
                    <Icon className={`h-6 w-6 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold ${config.color}`}>{config.label}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${risk.badge}`}>
                      Risco {risk.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-light text-white">{f.probability}%</p>
                    <p className="text-[10px] text-slate-500">probabilidade</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Gauge className="h-3.5 w-3.5" />Intensidade: <span className="text-white">{intensityLabels[f.intensity] ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <TrendingUp className="h-3.5 w-3.5" />Nível: <span className={risk.text}>{risk.label}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 text-slate-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span className="text-white">
                      {moment(f.expected_start).format('ddd DD/MM HH:mm')} — {moment(f.expected_end).format('ddd DD/MM HH:mm')}
                    </span>
                  </div>
                </div>

                {open && (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <p className="text-sm text-slate-300">{f.description}</p>
                    {f.recommendations && (
                      <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                        <div>
                          <p className="text-xs font-semibold text-amber-300">Recomendações de proteção</p>
                          <p className="mt-0.5 text-xs text-amber-100/90">{f.recommendations}</p>
                        </div>
                      </div>
                    )}
                    {f.location_name && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5" />{f.location_name}</p>
                    )}
                  </div>
                )}

                <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-500">
                  {open ? 'Toque para fechar' : 'Toque para detalhes'}
                  <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                </p>
              </button>
            );
          })}
          <p className="pt-2 text-center text-[11px] text-slate-600">
            Previsão calculada a partir de dados da Open-Meteo. Use como apoio à decisão.
          </p>
        </div>
      )}
    </div>
  );
}
