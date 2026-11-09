import { useState } from 'react';
import moment from 'moment';
import { Navigation, MapPin, Radar } from 'lucide-react';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { gpsRiskColors, gpsRiskLabels } from '@/lib/labels';
import { LoadingBlock } from '@/components/ui/spinner';
import PageHeader from '@/components/smarthail/PageHeader';
import RiskMap from '@/components/smarthail/RiskMap';

const module = getModule('maps');

export default function RiskMaps() {
  const { data: points, loading } = useEntityList('GpsTracking', '-timestamp', 100);
  const [selectedId, setSelectedId] = useState(null);
  const [radar, setRadar] = useState(true);
  const hasDemo = points.some((p) => p.demo);

  return (
    <div>
      <PageHeader module={module} subtitle="Trajeto das últimas 60 horas" />

      <div className="relative h-[50vh] min-h-[280px] overflow-hidden rounded-2xl border border-white/10">
        {loading ? <LoadingBlock className="h-full" spinner={module.spinner} /> : (
          <RiskMap points={points} selectedId={selectedId} onSelect={setSelectedId} radar={radar} />
        )}
        <button
          onClick={() => setRadar((r) => !r)}
          aria-pressed={radar}
          className={`absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur transition ${
            radar ? 'border-sky-400/50 bg-sky-500/30 text-sky-100' : 'border-white/15 bg-slate-900/80 text-slate-300'
          }`}
        >
          <Radar className="h-3.5 w-3.5" />
          Radar de chuva {radar ? 'ligado' : 'desligado'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {Object.entries(gpsRiskLabels).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1 text-[11px] text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: gpsRiskColors[key] }} />
            {label}
          </span>
        ))}
      </div>

      {hasDemo && (
        <p className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
          Os pontos anteriores ao primeiro acesso formam um trajeto de demonstração ao redor da sua posição. O risco de
          cada ponto usa o clima real daquele horário. Com o rastreador do veículo, o trajeto passa a ser o real.
        </p>
      )}

      <h2 className="mb-3 mt-6 text-sm font-semibold text-white">Histórico de Posições</h2>
      {!loading && points.length === 0 && <p className="text-sm text-slate-500">Nenhuma posição registrada.</p>}
      <div className="space-y-2">
        {points.map((p, i) => {
          const selected = p.id === selectedId;
          const color = gpsRiskColors[p.risk_level];
          return (
            <button
              key={p.id}
              onClick={() => setSelectedId(selected ? null : p.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                selected ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/5 bg-white/5 hover:bg-white/[0.08]'
              }`}
            >
              <div className="rounded-lg p-2" style={{ backgroundColor: `${color}20` }}>
                {i === 0 ? <Navigation className="h-4 w-4" style={{ color }} /> : <MapPin className="h-4 w-4" style={{ color }} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {p.location_name}
                  {i === 0 && <span className="ml-2 text-[10px] font-bold uppercase text-emerald-400">Atual</span>}
                </p>
                <p className="text-xs text-slate-400">{moment(p.timestamp).format('DD/MM HH:mm')} · {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</p>
              </div>
              <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase" style={{ color, backgroundColor: `${color}20` }}>
                {gpsRiskLabels[p.risk_level]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
