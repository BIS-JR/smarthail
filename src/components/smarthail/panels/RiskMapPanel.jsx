import { Navigation } from 'lucide-react';
import moment from 'moment';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { gpsRiskColors, gpsRiskLabels } from '@/lib/labels';
import { LoadingBlock } from '@/components/ui/spinner';
import RiskMap from '../RiskMap';
import PanelLink, { PanelTitle } from './PanelLink';

const module = getModule('maps');

export default function RiskMapPanel() {
  const { data: tracking, loading } = useEntityList('GpsTracking', '-timestamp', 10);
  const latest = tracking[0];

  return (
    <div className="space-y-4">
      <PanelTitle module={module}>Geolocalização e monitoramento</PanelTitle>

      {latest && (
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/5 p-3">
          <Navigation className="h-4 w-4 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Localização atual · {moment(latest.timestamp).format('HH:mm')}</p>
            <p className="truncate text-sm font-medium text-white">{latest.location_name}</p>
          </div>
          <span
            className="ml-auto shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase"
            style={{ color: gpsRiskColors[latest.risk_level], backgroundColor: `${gpsRiskColors[latest.risk_level]}20` }}
          >
            {gpsRiskLabels[latest.risk_level]}
          </span>
        </div>
      )}

      <div className="h-48 overflow-hidden rounded-xl border border-white/10">
        {loading ? <LoadingBlock className="h-full" spinner={module.spinner} /> : <RiskMap points={tracking} compact />}
      </div>

      <PanelLink module={module}>Ver histórico GPS 60h</PanelLink>
    </div>
  );
}
