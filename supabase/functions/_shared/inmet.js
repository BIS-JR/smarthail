/**
 * Avisos meteorológicos oficiais do INMET (Instituto Nacional de Meteorologia).
 *
 * Fonte: https://apiprevmet3.inmet.gov.br/avisos/ativos — JSON público com os
 * avisos de hoje e futuros, cada um com o polígono GeoJSON da área afetada.
 * Licença: conteúdo pode ser reproduzido citando a fonte (INMET).
 *
 * A API não libera CORS, então é consultada apenas no servidor (Edge Functions).
 */

const INMET_URL = 'https://apiprevmet3.inmet.gov.br/avisos/ativos';

// Graus de severidade do INMET → severidade do SMARTHAIL
const SEVERITY = {
  'perigo potencial': 'medium',
  perigo: 'high',
  'grande perigo': 'critical',
};

// Tipo do aviso (campo "descricao") → tipo de alerta do SMARTHAIL.
// Avisos sem impacto direto no veículo (baixa umidade, onda de calor) são ignorados.
function mapType(descricao, riscos) {
  const d = descricao.toLowerCase();
  const text = `${d} ${riscos.join(' ').toLowerCase()}`;
  if (d.includes('granizo')) return 'hail';
  if (d.includes('tempestade')) return /granizo/.test(text) ? 'hail' : 'storm';
  if (d.includes('acumulado')) return 'flood';
  if (d.includes('chuva')) return 'rain';
  if (d.includes('vendaval') || d.includes('vento')) return 'wind';
  if (d.includes('geada') || d.includes('frio') || d.includes('declínio de temperatura')) return 'frost';
  return null;
}

/** "2026-11-10 00:01" (horário de Brasília) → ISO UTC */
function brasiliaToIso(value) {
  if (!value) return null;
  const [date, time = '00:00'] = String(value).trim().split(/[ T]/);
  const iso = new Date(`${date}T${time.slice(0, 5)}:00-03:00`);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function parseGeometry(poligono) {
  try {
    const g = typeof poligono === 'string' ? JSON.parse(poligono) : poligono;
    if (g?.type === 'Polygon') return [g.coordinates];
    if (g?.type === 'MultiPolygon') return g.coordinates;
  } catch {
    /* polígono inválido */
  }
  return [];
}

/** Ray casting: ponto [lng, lat] dentro de um anel. */
function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Ponto dentro de (Multi)Polígono, respeitando buracos. */
export function pointInPolygons(lng, lat, polygons) {
  return polygons.some(([outer, ...holes]) => inRing([lng, lat], outer) && !holes.some((h) => inRing([lng, lat], h)));
}

/** Baixa e normaliza os avisos ativos (hoje + futuros). */
export async function fetchInmetWarnings() {
  const res = await fetch(INMET_URL, {
    signal: AbortSignal.timeout(20000),
    headers: { 'User-Agent': 'SMARTHAIL/1.1 (monitoramento climatico veicular)' },
  });
  if (!res.ok) throw new Error(`INMET respondeu ${res.status}`);
  const data = await res.json();
  const all = [...(data.hoje ?? []), ...(data.futuro ?? [])];

  const warnings = [];
  for (const a of all) {
    if (a.encerrado) continue;
    const riscos = Array.isArray(a.riscos) ? a.riscos : [];
    const instrucoes = Array.isArray(a.instrucoes) ? a.instrucoes : [];
    const type = mapType(String(a.descricao ?? ''), riscos);
    const severity = SEVERITY[String(a.severidade ?? '').trim().toLowerCase()];
    const polygons = parseGeometry(a.poligono);
    if (!type || !severity || !polygons.length) continue;

    warnings.push({
      id: a.id_aviso ?? a.id,
      type,
      severity,
      evento: a.descricao,
      grau: a.severidade,
      start: brasiliaToIso(a.inicio) ?? a.data_inicio,
      end: brasiliaToIso(a.fim) ?? a.data_fim,
      riscos: riscos.map((r) => String(r).trim()).filter(Boolean),
      instrucoes: instrucoes.map((r) => String(r).trim()).filter(Boolean),
      polygons,
    });
  }
  return warnings;
}

/** Avisos do INMET que cobrem a posição, no formato ClimateAlert do SMARTHAIL. */
export function inmetAlertsFor(warnings, location) {
  const now = Date.now();
  return warnings
    .filter((w) => pointInPolygons(location.lng, location.lat, w.polygons))
    .filter((w) => !w.end || new Date(w.end).getTime() > now - 24 * 3600 * 1000)
    .map((w) => {
      const instrucoes = w.instrucoes.slice(0, 2).join(' ');
      return {
        key: `inmet:${w.id}`,
        type: w.type,
        severity: w.severity,
        title: `INMET: ${w.evento} — ${w.grau}`,
        description: [w.riscos.join(' '), instrucoes].filter(Boolean).join(' ').slice(0, 900),
        timestamp: w.start ?? new Date().toISOString(),
        expected_end: w.end,
        is_active: (!w.start || new Date(w.start).getTime() <= now + 24 * 3600 * 1000) && (!w.end || new Date(w.end).getTime() > now),
        location_name: location.name,
        location_lat: location.lat,
        location_lng: location.lng,
        source: 'inmet',
      };
    });
}
