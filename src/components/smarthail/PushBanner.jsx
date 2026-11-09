import { BellRing } from 'lucide-react';
import { usePush } from '@/hooks/usePush';

/** Convite para ativar notificações; some quando já estão ativas ou não são suportadas. */
export default function PushBanner() {
  const { status, busy, enable, needsInstall } = usePush();
  if (status !== 'disabled' && status !== 'denied') return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
      <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-100">Receba alertas com o app fechado</p>
        <p className="mt-0.5 text-xs text-amber-100/80">
          {status === 'denied'
            ? 'As notificações estão bloqueadas. Libere-as nas configurações do site no navegador (ícone de cadeado ao lado do endereço).'
            : needsInstall
              ? 'No iPhone, toque em Compartilhar → "Adicionar à Tela de Início", abra o SMARTHAIL por lá e ative.'
              : 'Avisamos quando houver risco alto de granizo, tempestade, vento ou alagamento onde você está.'}
        </p>
      </div>
      {status === 'disabled' && !needsInstall && (
        <button
          onClick={enable}
          disabled={busy}
          className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
        >
          {busy ? 'Ativando…' : 'Ativar'}
        </button>
      )}
    </div>
  );
}
