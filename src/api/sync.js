/**
 * Sincronização climática: localização → Open-Meteo → entidades.
 * Chamada ao abrir o app (com intervalo mínimo) e pelo botão "Atualizar".
 */
import { entities, readJSON, writeJSON, PREFIX } from './store';
import {
  DEFAULT_LOCATION,
  getDeviceLocation,
  reverseGeocode,
  fetchOpenMeteo,
  buildWeatherReadings,
  buildRiskForecasts,
  buildAlerts,
  riskFromCondition,
  readingAt,
} from './weather';
import { updatePushLocation } from './push';
import { supabase, isCloud } from './supabase';

const MIN_INTERVAL_MS = 15 * 60 * 1000;
const HOUR = 3600;

// Usuário ativo (definido pelo ClimateProvider) — os metadados ficam por usuário neste aparelho
let activeUserId = null;
export function setSyncUser(userId) {
  activeUserId = userId;
}
const metaKey = () => `${PREFIX}:${activeUserId}:sync`;

export function getSyncMeta() {
  return activeUserId ? readJSON(metaKey(), null) : null;
}

let inFlight = null;

/** Sincroniza dados climáticos. Retorna metadados da sincronização. */
export function syncClimate({ force = false } = {}) {
  if (inFlight) return inFlight;
  const meta = getSyncMeta();
  if (!force && meta?.at && Date.now() - new Date(meta.at).getTime() < MIN_INTERVAL_MS) {
    return Promise.resolve(meta);
  }
  inFlight = runSync().finally(() => { inFlight = null; });
  return inFlight;
}

async function runSync() {
  const device = await getDeviceLocation();
  const coords = device ?? DEFAULT_LOCATION;
  const name = device ? await reverseGeocode(coords.lat, coords.lng) : DEFAULT_LOCATION.name;
  const location = { lat: coords.lat, lng: coords.lng, name };

  const data = await fetchOpenMeteo(location.lat, location.lng);

  // Leituras: substitui as leituras reais anteriores (mantém dados de demonstração)
  const readings = buildWeatherReadings(data, location);
  await entities.WeatherData.deleteWhere({ eq: { demo: false } });
  await entities.WeatherData.bulkCreate(readings);

  // Previsões: sempre recalculadas
  const forecasts = buildRiskForecasts(data, location);
  await entities.RiskForecast.deleteWhere({ eq: { demo: false } });
  await entities.RiskForecast.bulkCreate(forecasts);

  // Alertas: avisos oficiais do INMET + alertas calculados, atualizados por chave (histórico de 30 dias)
  const official = await fetchOfficialAlerts(location);
  await upsertAlerts([...official, ...buildAlerts(data, forecasts, location)]);

  // Trajeto GPS, capa e posição usada pelo servidor de notificações
  await updateTracking(data, location, forecasts);
  await ensureCoverStatus();
  await updatePushLocation(location).catch(() => {});

  const meta = { at: new Date().toISOString(), location, usedDeviceLocation: Boolean(device) };
  if (activeUserId) writeJSON(metaKey(), meta);
  return meta;
}

/** Avisos do INMET para a posição (via Edge Function; o INMET não libera CORS). */
async function fetchOfficialAlerts(location) {
  if (!isCloud) return [];
  try {
    const { data, error } = await supabase.functions.invoke('inmet-alerts', { body: location });
    if (error) throw error;
    return data?.alerts ?? [];
  } catch (e) {
    console.warn('Avisos do INMET indisponíveis', e);
    return [];
  }
}

async function upsertAlerts(fresh) {
  const now = Date.now();
  const existing = await entities.ClimateAlert.list(null);
  const byKey = new Map(existing.filter((a) => a.key).map((a) => [a.key, a]));

  for (const alert of fresh) {
    const prev = byKey.get(alert.key);
    if (prev) {
      // eslint-disable-next-line no-unused-vars
      const { timestamp, ...rest } = alert; // mantém a data de emissão original
      await entities.ClimateAlert.update(prev.id, rest);
    } else {
      try {
        await entities.ClimateAlert.create(alert);
      } catch {
        /* o servidor de alertas pode ter criado a mesma chave ao mesmo tempo */
      }
    }
  }

  // Desativa alertas cuja janela terminou e remove os muito antigos
  for (const a of existing) {
    if (a.is_active && a.expected_end && new Date(a.expected_end).getTime() < now) {
      await entities.ClimateAlert.update(a.id, { is_active: false });
    }
  }
  const cutoff = new Date(now - 30 * 24 * HOUR * 1000).toISOString();
  await entities.ClimateAlert.deleteWhere({ lt: { timestamp: cutoff } });
}

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const RISK_ORDER = ['safe', 'low', 'moderate', 'high', 'critical'];
const FORECAST_TO_POINT = { low: 'safe', moderate: 'moderate', high: 'high', extreme: 'critical' };

async function updateTracking(data, location, forecasts) {
  const now = Date.now();
  const [anyPoint] = await entities.GpsTracking.list('-timestamp', 1);

  // Primeiro acesso: cria um trajeto de demonstração nas últimas 60h ao redor da localização,
  // com o risco calculado a partir do clima real de cada horário.
  if (!anyPoint) {
    const offsets = [
      [0.021, -0.018], [0.016, -0.011], [0.010, -0.004], [0.004, 0.003],
      [-0.003, 0.009], [-0.008, 0.004], [-0.004, -0.003],
    ];
    const route = offsets.map(([dLat, dLng], i) => {
      const t = now / 1000 - (59 - i * 8) * HOUR;
      const r = readingAt(data, t);
      return {
        timestamp: new Date(t * 1000).toISOString(),
        latitude: location.lat + dLat,
        longitude: location.lng + dLng,
        location_name: `${location.name} · ponto ${i + 1}`,
        risk_level: riskFromCondition(r.condition, r.gust),
        demo: true,
      };
    });
    await entities.GpsTracking.bulkCreate(route);
  }

  // Ponto atual: novo registro se passou 30 min ou o veículo se moveu > 200 m
  const [latest] = await entities.GpsTracking.list('-timestamp', 1);
  const moved = !latest || distanceMeters({ lat: latest.latitude, lng: latest.longitude }, location) > 200;
  const stale = !latest || now - new Date(latest.timestamp).getTime() > 30 * 60 * 1000;
  if (moved || stale) {
    const current = readingAt(data, now / 1000);
    const nearTerm = forecasts
      .filter((f) => new Date(f.expected_start).getTime() < now + 6 * HOUR * 1000)
      .map((f) => FORECAST_TO_POINT[f.risk_level]);
    const risk = [riskFromCondition(current.condition, current.gust), ...nearTerm]
      .reduce((max, r) => (RISK_ORDER.indexOf(r) > RISK_ORDER.indexOf(max) ? r : max), 'safe');

    await entities.GpsTracking.create({
      timestamp: new Date(now).toISOString(),
      latitude: location.lat,
      longitude: location.lng,
      location_name: location.name,
      risk_level: risk,
    });
  }

  // Mantém no máximo 60h de pontos
  const cutoff = new Date(now - 60 * HOUR * 1000).toISOString();
  await entities.GpsTracking.deleteWhere({ lt: { timestamp: cutoff } });
}

async function ensureCoverStatus() {
  const [status] = await entities.CoverStatus.list('-timestamp', 1);
  if (status) return;
  await entities.CoverStatus.create({
    timestamp: new Date().toISOString(),
    is_inflated: false,
    magnets_status: 'all_attached',
    integrity: 'perfect',
    battery_level: 92,
    last_action: 'check',
    notes: 'Capa pareada com o aplicativo',
  });
}

// ---------------------------------------------------------------------------
// Dados de demonstração (para apresentações em dias sem eventos climáticos)
// ---------------------------------------------------------------------------

export async function addDemoData() {
  const loc = getSyncMeta()?.location ?? DEFAULT_LOCATION;
  const now = Date.now();
  const iso = (offsetHours) => new Date(now + offsetHours * HOUR * 1000).toISOString();
  const base = { location_name: loc.name, location_lat: loc.lat, location_lng: loc.lng, demo: true };
  const stamp = now.toString(36);

  await entities.ClimateAlert.bulkCreate([
    { ...base, key: `demo:hail:${stamp}`, type: 'hail', severity: 'critical', is_active: true, timestamp: iso(-0.5), expected_end: iso(4),
      title: '[Simulação] Granizo severo se aproximando',
      description: 'Célula de tempestade com granizo de até 3 cm a 25 km, deslocando-se em sua direção. Infle a capa agora.' },
    { ...base, key: `demo:storm:${stamp}`, type: 'storm', severity: 'high', is_active: false, timestamp: iso(-30),
      title: '[Simulação] Tempestade com raios',
      description: 'Rajadas de 75 km/h e descargas elétricas registradas na região.' },
    { ...base, key: `demo:flood:${stamp}`, type: 'flood', severity: 'medium', is_active: false, timestamp: iso(-80),
      title: '[Simulação] Pontos de alagamento',
      description: 'Acumulado de 48 mm em 3 horas. Evite estacionamentos em áreas baixas.' },
  ]);

  await entities.RiskForecast.bulkCreate([
    { type: 'hail', risk_level: 'extreme', probability: 88, intensity: 'severe', expected_start: iso(1), expected_end: iso(3),
      description: '[Simulação] Supercélula com potencial de granizo grande.',
      recommendations: 'Infle a capa imediatamente e, se possível, leve o veículo para garagem coberta.',
      location_name: loc.name, demo: true },
  ]);

  await entities.InsuranceClaim.create({
    incident_date: iso(-30), impact_intensity: 'heavy', status: 'approved', confirmed: true, insurer_sent: true,
    location_lat: loc.lat, location_lng: loc.lng, location_name: loc.name, weather_condition: 'hail',
    description: '[Simulação] Amassados no capô e teto após chuva de granizo.',
    report_summary: 'Sensores registraram 37 impactos em 4 minutos. Capa acionada 2 min após o início do evento.',
    demo: true,
  });
}

export async function clearDemoData() {
  for (const name of ['ClimateAlert', 'RiskForecast', 'InsuranceClaim', 'WeatherData']) {
    await entities[name].deleteWhere({ eq: { demo: true } });
  }
}
