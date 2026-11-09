import { useState } from 'react';
import moment from 'moment';
import { Plus, Shield, FileText, Clock, AlertTriangle, MapPin, CheckCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useEntityList } from '@/hooks/useEntityList';
import { useClimate } from '@/lib/ClimateContext';
import { getModule } from '@/lib/modules';
import { claimStatusConfig, intensityLabels } from '@/lib/labels';
import { LoadingBlock } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PageHeader from '@/components/smarthail/PageHeader';
import { labelMap } from '@/components/smarthail/WeatherIcon';

const module = getModule('insurance');

const INTENSITIES = [
  { value: 'light', desc: 'Marcas leves, sem amassados' },
  { value: 'moderate', desc: 'Pequenos amassados' },
  { value: 'heavy', desc: 'Vários amassados visíveis' },
  { value: 'severe', desc: 'Vidros ou estrutura danificados' },
];

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 text-sm last:border-0">
      <span className="shrink-0 text-slate-400">{label}</span>
      <span className="text-right text-white">{children}</span>
    </div>
  );
}

function buildSummary({ intensity, locationName, condition, date }) {
  return `Sinistro registrado em ${moment(date).format('DD/MM/YYYY [às] HH:mm')} em ${locationName}. ` +
    `Impacto de intensidade ${intensityLabels[intensity].toLowerCase()} com condição climática "${labelMap[condition] ?? 'não informada'}" no momento do registro. ` +
    'Dados de localização e clima coletados automaticamente pelo SMARTHAIL.';
}

function NewClaimDialog({ open, onOpenChange, onCreated }) {
  const { meta } = useClimate();
  const [step, setStep] = useState('form');
  const [intensity, setIntensity] = useState('moderate');
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState(null);
  const [saving, setSaving] = useState(false);
  const [incidentDate, setIncidentDate] = useState(null);

  const reset = () => {
    setStep('form');
    setIntensity('moderate');
    setLocationName(meta?.location?.name ?? '');
    setDescription('');
    setCondition(null);
  };

  const handleOpenChange = (o) => {
    if (o) reset();
    onOpenChange(o);
  };

  const goToReview = async () => {
    const [latest] = await api.entities.WeatherData.list('-timestamp', 1);
    setCondition(latest?.condition ?? null);
    setIncidentDate(new Date().toISOString());
    setStep('review');
  };

  const confirm = async () => {
    setSaving(true);
    try {
      const loc = meta?.location;
      const name = locationName.trim() || loc?.name || 'Local não informado';
      await api.entities.InsuranceClaim.create({
        incident_date: incidentDate,
        impact_intensity: intensity,
        description: description.trim(),
        location_name: name,
        location_lat: loc?.lat,
        location_lng: loc?.lng,
        weather_condition: condition,
        status: 'pending_review',
        confirmed: true,
        insurer_sent: false,
        report_summary: buildSummary({ intensity, locationName: name, condition, date: incidentDate }),
      });
      toast.success('Sinistro registrado', { description: 'Status: em revisão.' });
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast.error('Falha ao registrar sinistro', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Novo acionamento</DialogTitle>
              <DialogDescription>Data, hora, coordenadas e clima serão registrados automaticamente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-300">Intensidade do impacto</p>
                <div className="grid grid-cols-2 gap-2">
                  {INTENSITIES.map((i) => (
                    <button
                      key={i.value}
                      onClick={() => setIntensity(i.value)}
                      className={`rounded-xl border p-3 text-left transition ${
                        intensity === i.value ? 'border-rose-500/50 bg-rose-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{intensityLabels[i.value]}</p>
                      <p className="text-[11px] text-slate-400">{i.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-300">Localização</span>
                <input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ex.: Rua das Flores, 100"
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-300">Descrição do dano</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que aconteceu e as partes afetadas"
                  className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-rose-500"
                />
              </label>
              <button
                onClick={goToReview}
                disabled={!description.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
              >
                Revisar acionamento
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-rose-400" />Double-Check</DialogTitle>
              <DialogDescription>Confira os dados antes de gravar o sinistro.</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-2">
              <Row label="Data/hora">{moment(incidentDate).format('DD/MM/YYYY HH:mm')}</Row>
              <Row label="Intensidade">{intensityLabels[intensity]}</Row>
              <Row label="Local">{locationName || meta?.location?.name || '—'}</Row>
              <Row label="Coordenadas">
                {meta?.location ? `${meta.location.lat.toFixed(5)}, ${meta.location.lng.toFixed(5)}` : '—'}
              </Row>
              <Row label="Clima">{labelMap[condition] ?? '—'}</Row>
              <Row label="Descrição">{description}</Row>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setStep('form')}
                className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />Corrigir
              </button>
              <button
                onClick={confirm}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-3 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
              >
                {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                Confirmar
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Insurance() {
  const { data: claims, loading, reload } = useEntityList('InsuranceClaim', '-incident_date', 100);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);

  const newButton = (
    <button
      onClick={() => setCreating(true)}
      aria-label="Novo acionamento"
      className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-2 text-white shadow-lg transition hover:brightness-110"
    >
      <Plus className="h-4 w-4" />
    </button>
  );

  return (
    <div>
      <PageHeader module={module} subtitle="Sinistros e relatórios" actions={newButton} />

      {loading ? (
        <LoadingBlock spinner={module.spinner} />
      ) : claims.length === 0 ? (
        <div className="py-16 text-center">
          <Shield className="mx-auto mb-3 h-14 w-14 text-slate-600" />
          <p className="text-sm text-slate-400">Nenhum sinistro registrado</p>
          <p className="mt-1 text-xs text-slate-600">Seu veículo está protegido. Use o botão + se precisar acionar o seguro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const status = claimStatusConfig[claim.status] ?? claimStatusConfig.draft;
            return (
              <button
                key={claim.id}
                onClick={() => setSelected(claim)}
                className="w-full rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition hover:bg-white/[0.08]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileText className="h-4 w-4 text-rose-400" />
                    {moment(claim.incident_date).format('DD/MM/YYYY')}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${status.badge}`}>{status.label}</span>
                </div>
                <p className="line-clamp-2 text-sm text-slate-300">{claim.description}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{moment(claim.incident_date).format('HH:mm')}</span>
                  <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{intensityLabels[claim.impact_intensity]}</span>
                  {claim.location_name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{claim.location_name}</span>}
                  {claim.confirmed && <span className="flex items-center gap-1 text-green-400"><CheckCircle className="h-3 w-3" />Confirmado</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <NewClaimDialog open={creating} onOpenChange={setCreating} onCreated={reload} />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhe do sinistro</DialogTitle>
                <DialogDescription>Registrado em {moment(selected.created_date).format('DD/MM/YYYY HH:mm')}</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-2">
                <Row label="Data/hora">{moment(selected.incident_date).format('DD/MM/YYYY HH:mm')}</Row>
                <Row label="Intensidade">{intensityLabels[selected.impact_intensity]}</Row>
                <Row label="Local">{selected.location_name ?? '—'}</Row>
                <Row label="Coordenadas">
                  {selected.location_lat != null ? `${selected.location_lat.toFixed(5)}, ${selected.location_lng.toFixed(5)}` : '—'}
                </Row>
                <Row label="Clima">{labelMap[selected.weather_condition] ?? '—'}</Row>
                <Row label="Status">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${(claimStatusConfig[selected.status] ?? claimStatusConfig.draft).badge}`}>
                    {(claimStatusConfig[selected.status] ?? claimStatusConfig.draft).label}
                  </span>
                </Row>
                <Row label="Enviado à seguradora">{selected.insurer_sent ? 'Sim' : 'Ainda não'}</Row>
              </div>
              {selected.description && (
                <div className="mt-4">
                  <p className="mb-1 text-xs font-semibold text-slate-400">Descrição</p>
                  <p className="text-sm text-slate-200">{selected.description}</p>
                </div>
              )}
              {selected.report_summary && (
                <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                  <p className="mb-1 text-xs font-semibold text-rose-300">Resumo do relatório</p>
                  <p className="text-xs text-rose-100/90">{selected.report_summary}</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
