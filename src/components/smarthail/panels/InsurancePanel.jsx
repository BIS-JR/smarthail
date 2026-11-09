import { Shield, FileText, AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';
import moment from 'moment';
import { useEntityList } from '@/hooks/useEntityList';
import { getModule } from '@/lib/modules';
import { claimStatusConfig, intensityLabels } from '@/lib/labels';
import { LoadingBlock } from '@/components/ui/spinner';
import PanelLink, { PanelTitle } from './PanelLink';

const module = getModule('insurance');

export default function InsurancePanel() {
  const { data: claims, loading } = useEntityList('InsuranceClaim', '-incident_date', 5);

  return (
    <div className="space-y-4">
      <PanelTitle module={module}>Relatórios de impacto</PanelTitle>

      {loading ? (
        <LoadingBlock className="py-8" spinner={module.spinner} />
      ) : claims.length === 0 ? (
        <div className="py-8 text-center">
          <Shield className="mx-auto mb-3 h-12 w-12 text-slate-600" />
          <p className="text-sm text-slate-500">Nenhum acionamento registrado</p>
          <p className="mt-1 text-xs text-slate-600">Seu veículo está protegido</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.slice(0, 2).map((claim) => {
            const status = claimStatusConfig[claim.status] ?? claimStatusConfig.draft;
            return (
              <div key={claim.id} className="rounded-xl border border-white/5 bg-white/5 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-rose-400" />
                    <span className="text-sm font-semibold text-white">{moment(claim.incident_date).format('DD/MM/YYYY')}</span>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${status.badge}`}>{status.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{moment(claim.incident_date).format('HH:mm')}</div>
                  <div className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Impacto {intensityLabels[claim.impact_intensity]?.toLowerCase()}</div>
                  {claim.location_name && (
                    <div className="col-span-2 flex items-center gap-1"><MapPin className="h-3 w-3" />{claim.location_name}</div>
                  )}
                </div>
                {claim.confirmed && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle className="h-3 w-3" />Double-check confirmado
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PanelLink module={module}>Gerenciar acionamentos</PanelLink>
    </div>
  );
}
