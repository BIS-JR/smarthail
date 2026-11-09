import { TrendingUp } from 'lucide-react';
import moment from 'moment';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { riskLevelConfig } from '@/lib/labels';
import { forecastTypeConfig } from '@/lib/forecast';
import { LoadingBlock } from '@/components/ui/spinner';
import PanelLink, { PanelTitle } from './PanelLink';

const module = getModule('forecast');

export default function ForecastPanel() {
  const { data, loading } = useEntityList('RiskForecast', 'expected_start', 20);
  const forecasts = [...data].sort((a, b) => b.probability - a.probability).slice(0, 3);

  return (
    <div className="space-y-4">
      <PanelTitle module={module}>Chuva, granizo e geada — próximas 72h</PanelTitle>

      {loading ? (
        <LoadingBlock className="py-8" spinner={module.spinner} />
      ) : forecasts.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">Nenhuma previsão de risco</div>
      ) : (
        <div className="space-y-3">
          {forecasts.map((f) => {
            const config = forecastTypeConfig[f.type] ?? forecastTypeConfig.rain;
            const risk = riskLevelConfig[f.risk_level] ?? riskLevelConfig.low;
            const Icon = config.icon;
            return (
              <div key={f.id} className={`rounded-xl border p-4 transition-all ${config.bg} ${config.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-2 ${config.bg}`}>
                    <Icon className={`h-6 w-6 ${config.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
                      <span className={`text-xs font-bold uppercase ${risk.text}`}>{risk.label}</span>
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <TrendingUp className="h-3 w-3 text-slate-500" />
                      <span className="text-xs text-slate-400">
                        Probabilidade: <span className="font-semibold text-white">{f.probability}%</span>
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-400">{f.description}</p>
                    <p className="mt-2 text-[10px] text-slate-500">
                      {moment(f.expected_start).format('DD/MM HH:mm')} — {moment(f.expected_end).format('DD/MM HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PanelLink module={module}>Ver previsões detalhadas</PanelLink>
    </div>
  );
}
