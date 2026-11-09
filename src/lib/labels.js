/** Rótulos e cores compartilhados entre painéis e páginas. */

export const severityConfig = {
  low: { label: 'Baixo', card: 'bg-green-500/10 border-green-500/20', text: 'text-green-400', badge: 'bg-green-500/15 text-green-400', dot: 'bg-green-400' },
  medium: { label: 'Médio', card: 'bg-yellow-500/10 border-yellow-500/20', text: 'text-yellow-400', badge: 'bg-yellow-500/15 text-yellow-400', dot: 'bg-yellow-400' },
  high: { label: 'Alto', card: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400', badge: 'bg-orange-500/15 text-orange-400', dot: 'bg-orange-400' },
  critical: { label: 'Crítico', card: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', badge: 'bg-red-500/15 text-red-400', dot: 'bg-red-400' },
};

export const alertTypeLabels = {
  rain: '🌧 Chuva', hail: '🧊 Granizo', frost: '❄️ Geada', storm: '⛈ Tempestade', wind: '💨 Vento', flood: '🌊 Inundação',
};

export const riskLevelConfig = {
  low: { label: 'Baixo', text: 'text-green-400', badge: 'bg-green-500/15 text-green-400' },
  moderate: { label: 'Moderado', text: 'text-yellow-400', badge: 'bg-yellow-500/15 text-yellow-400' },
  high: { label: 'Alto', text: 'text-orange-400', badge: 'bg-orange-500/15 text-orange-400' },
  extreme: { label: 'Extremo', text: 'text-red-400', badge: 'bg-red-500/15 text-red-400' },
};

export const intensityLabels = { light: 'Leve', moderate: 'Moderada', heavy: 'Forte', severe: 'Severa' };

// Leaflet exige cores em HEX no `pathOptions`
export const gpsRiskColors = {
  safe: '#22c55e', low: '#84cc16', moderate: '#eab308', high: '#f97316', critical: '#ef4444',
};
export const gpsRiskLabels = { safe: 'Seguro', low: 'Baixo', moderate: 'Moderado', high: 'Alto', critical: 'Crítico' };

export const claimStatusConfig = {
  draft: { label: 'Rascunho', badge: 'bg-slate-500/15 text-slate-400' },
  pending_review: { label: 'Em revisão', badge: 'bg-yellow-500/15 text-yellow-400' },
  submitted: { label: 'Enviado', badge: 'bg-blue-500/15 text-blue-400' },
  approved: { label: 'Aprovado', badge: 'bg-green-500/15 text-green-400' },
  rejected: { label: 'Rejeitado', badge: 'bg-red-500/15 text-red-400' },
};

export const magnetConfig = {
  all_attached: { label: 'Todos aderentes', text: 'text-green-400', bar: 'bg-green-400', pct: 100 },
  partial: { label: 'Parcial', text: 'text-yellow-400', bar: 'bg-yellow-400', pct: 55 },
  detached: { label: 'Desconectados', text: 'text-red-400', bar: 'bg-red-400', pct: 10 },
};

export const integrityConfig = {
  perfect: { label: 'Perfeita', text: 'text-green-400', bar: 'bg-green-400', pct: 100 },
  good: { label: 'Boa', text: 'text-blue-400', bar: 'bg-blue-400', pct: 75 },
  warning: { label: 'Atenção', text: 'text-yellow-400', bar: 'bg-yellow-400', pct: 50 },
  critical: { label: 'Crítica', text: 'text-red-400', bar: 'bg-red-400', pct: 25 },
};

export const coverActionLabels = {
  inflate: 'Inflar', deflate: 'Desinflar', check: 'Verificação', emergency_deploy: 'Emergência',
};

export function batteryColor(level = 0) {
  if (level > 50) return { text: 'text-green-400', bar: 'bg-green-400' };
  if (level > 20) return { text: 'text-yellow-400', bar: 'bg-yellow-400' };
  return { text: 'text-red-400', bar: 'bg-red-400' };
}
