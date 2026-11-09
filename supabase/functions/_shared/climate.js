/**
 * Núcleo climático do SMARTHAIL — JavaScript puro, sem dependências de navegador.
 *
 * Usado em dois lugares, para que o cálculo seja idêntico:
 *   - no app (src/api/weather.js reexporta este módulo);
 *   - na Edge Function `check-alerts` (Deno), que envia notificações push.
 *
 * Fonte: Open-Meteo (https://open-meteo.com).
 */

export const DEFAULT_LOCATION = { lat: -23.5505, lng: -46.6333, name: 'São Paulo, SP' };

const HOUR = 3600;
const round1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Open-Meteo
// ---------------------------------------------------------------------------

export async function fetchOpenMeteo(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,pressure_msl,precipitation',
    hourly: [
      'temperature_2m', 'relative_humidity_2m', 'weather_code', 'wind_speed_10m', 'wind_gusts_10m',
      'pressure_msl', 'precipitation_probability', 'precipitation',
      // Instabilidade atmosférica, base do indicador de granizo
      'cape', 'lifted_index', 'freezing_level_height',
    ].join(','),
    daily: 'temperature_2m_max,temperature_2m_min',
    past_days: '3',
    forecast_days: '4',
    timezone: 'auto',
    timeformat: 'unixtime',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo respondeu ${res.status}`);
  return res.json();
}

/** Converte código WMO + temperatura/vento em uma condição do SMARTHAIL. */
export function conditionFromCode(code, temp, wind) {
  if (code === 96 || code === 99) return 'hail';
  if (code === 95) return 'storm';
  if ([65, 82].includes(code)) return 'heavy_rain';
  if ([66, 67].includes(code)) return 'frost';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 63) || code === 80 || code === 81) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (wind >= 45) return 'windy';
  if (temp <= 1 && code <= 3) return 'frost';
  if (code === 0) return 'sunny';
  if (code === 1 || code === 2) return 'partly_cloudy';
  return 'cloudy';
}

/** Achata a resposta horária em uma lista de objetos. */
function hourlyRows(data) {
  const h = data.hourly;
  return h.time.map((t, i) => {
    const row = {
      t,
      temp: h.temperature_2m[i],
      humidity: h.relative_humidity_2m[i],
      code: h.weather_code[i],
      wind: h.wind_speed_10m[i],
      gust: h.wind_gusts_10m[i] ?? 0,
      pressure: h.pressure_msl[i],
      prob: h.precipitation_probability[i] ?? 0,
      precip: h.precipitation[i] ?? 0,
      cape: h.cape?.[i] ?? 0,
      li: h.lifted_index?.[i] ?? null,
      fzl: h.freezing_level_height?.[i] ?? null,
    };
    row.hail = hailScore(row);
    return row;
  });
}

function dailyRange(data, t) {
  const { time, temperature_2m_max: max, temperature_2m_min: min } = data.daily;
  const i = time.findIndex((d) => t >= d && t < d + 24 * HOUR);
  return i === -1 ? {} : { temp_min: round1(min[i]), temp_max: round1(max[i]) };
}

/** Data/hora no fuso do local consultado (funciona igual no navegador e no servidor). */
function formatLocal(isoOrUnix, data) {
  const unix = typeof isoOrUnix === 'number' ? isoOrUnix : new Date(isoOrUnix).getTime() / 1000;
  const d = new Date((unix + (data.utc_offset_seconds ?? 0)) * 1000);
  const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const pad = (n) => String(n).padStart(2, '0');
  return `${days[d.getUTCDay()]} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} às ${pad(d.getUTCHours())}h`;
}

// ---------------------------------------------------------------------------
// Indicador de granizo
// ---------------------------------------------------------------------------
//
// Os códigos WMO de "tempestade com granizo" (96/99) da Open-Meteo só são
// previstos na Europa Central. Para o Brasil, estimamos o potencial de granizo
// a partir da instabilidade atmosférica:
//   - CAPE (energia disponível para convecção): quanto maior, mais fortes as
//     correntes ascendentes que formam pedras de granizo;
//   - Lifted Index: valores muito negativos indicam atmosfera muito instável;
//   - Isoterma de 0 °C baixa: o granizo derrete menos antes de chegar ao solo;
//   - Trovoada prevista (WMO 95) e rajadas fortes reforçam o sinal.
// Só há pontuação quando existe chance real de precipitação convectiva.
//
// Pontuação: < 1,5 sem risco · 1,5 baixo · 2 moderado · 3 alto · 4+ extremo.
// É um indicador estimado, não uma medição de granizo.

export function hailScore(r) {
  if (r.code === 99) return 4.5;
  if (r.code === 96) return 3.5;

  const convective = r.code >= 95 || (r.prob >= 40 && r.cape >= 800);
  if (!convective) return 0;

  let s = 0;
  if (r.cape >= 3000) s = 3;
  else if (r.cape >= 2000) s = 2;
  else if (r.cape >= 1000) s = 1;
  else if (r.cape >= 500) s = 0.5;

  if (r.li !== null && r.li <= -6) s += 1;
  else if (r.li !== null && r.li <= -3) s += 0.5;
  if (r.fzl !== null && r.fzl > 0 && r.fzl < 3500) s += 0.5;
  if (r.code >= 95) s += 1;
  if (r.gust >= 70) s += 0.5;
  return s;
}

function hailClassify(w) {
  const score = w.maxHail;
  let base, risk, intensity;
  if (score >= 4) [base, risk, intensity] = [75, 'extreme', 'severe'];
  else if (score >= 3) [base, risk, intensity] = [55, 'high', 'heavy'];
  else if (score >= 2) [base, risk, intensity] = [35, 'moderate', 'moderate'];
  else [base, risk, intensity] = [20, 'low', 'light'];

  // Ajusta pela chance de chuva: sem precipitação não há granizo.
  const factor = Math.min(1.1, Math.max(0.5, (w.prob || 50) / 80));
  let probability = Math.round(base * factor);
  if (w.maxCode === 99) probability = Math.max(probability, 85);
  else if (w.maxCode === 96) probability = Math.max(probability, 70);
  return { probability: Math.min(probability, 95), intensity, risk_level: risk };
}

// ---------------------------------------------------------------------------
// Leituras (WeatherData) — atual + últimas 60 horas
// ---------------------------------------------------------------------------

export function buildWeatherReadings(data, location) {
  const now = Date.now() / 1000;
  const base = { location_lat: location.lat, location_lng: location.lng, location_name: location.name, source: 'open-meteo' };

  const past = hourlyRows(data)
    .filter((r) => r.t <= now && r.t > now - 60 * HOUR && r.t < data.current.time - HOUR / 2)
    .map((r) => ({
      ...base,
      timestamp: new Date(r.t * 1000).toISOString(),
      temperature: round1(r.temp),
      ...dailyRange(data, r.t),
      condition: conditionFromCode(r.code, r.temp, r.wind),
      humidity: Math.round(r.humidity),
      wind_speed: Math.round(r.wind),
      pressure: Math.round(r.pressure),
      precipitation: r.precip,
    }));

  const c = data.current;
  const current = {
    ...base,
    timestamp: new Date(c.time * 1000).toISOString(),
    temperature: round1(c.temperature_2m),
    ...dailyRange(data, c.time),
    condition: conditionFromCode(c.weather_code, c.temperature_2m, c.wind_speed_10m),
    humidity: Math.round(c.relative_humidity_2m),
    wind_speed: Math.round(c.wind_speed_10m),
    pressure: Math.round(c.pressure_msl),
    precipitation: c.precipitation,
  };

  return [...past, current];
}

// ---------------------------------------------------------------------------
// Previsões de risco (RiskForecast) — próximas 72 horas
// ---------------------------------------------------------------------------

function groupWindows(rows, predicate) {
  const windows = [];
  let current = null;
  for (const r of rows) {
    if (predicate(r)) {
      if (current && r.t - current.at(-1).t <= 3 * HOUR) current.push(r);
      else windows.push((current = [r]));
    } else if (current && r.t - current.at(-1).t > 3 * HOUR) {
      current = null;
    }
  }
  return windows;
}

const RECOMMENDATIONS = {
  rain: {
    low: 'Sem ação necessária. Mantenha o monitoramento ativo.',
    moderate: 'Prefira estacionar em local coberto e evite áreas sujeitas a alagamento.',
    high: 'Estacione em local coberto ou elevado. Deixe a capa pronta para acionamento.',
    extreme: 'Risco de alagamento: retire o veículo de áreas baixas e infle a capa preventivamente.',
  },
  hail: {
    low: 'Sem ação necessária. A capa será sugerida se o risco aumentar.',
    moderate: 'Mantenha a bateria da capa carregada e verifique os magnetos.',
    high: 'Infle a capa antes do início da janela prevista ou leve o veículo para garagem coberta.',
    extreme: 'Granizo severo provável: infle a capa imediatamente e evite circular durante o evento.',
  },
  frost: {
    low: 'Sem ação necessária.',
    moderate: 'Proteja o para-brisa durante a madrugada; a capa reduz a formação de gelo.',
    high: 'Infle a capa à noite e evite usar água quente para descongelar os vidros.',
    extreme: 'Geada forte: mantenha o veículo coberto e verifique a bateria pela manhã.',
  },
};

function hailDescription(w) {
  const parts = [`Atmosfera instável, com CAPE de até ${Math.round(w.maxCape)} J/kg`];
  if (w.maxGust >= 50) parts.push(`rajadas de até ${Math.round(w.maxGust)} km/h`);
  if (w.minFzl) parts.push(`isoterma de 0 °C a ${Math.round(w.minFzl / 100) * 100} m`);
  return `${parts.join(', ')}. Indicador estimado de potencial de granizo.`;
}

const DESCRIPTIONS = {
  rain: (w) => `Precipitação de até ${round1(w.maxPrecip)} mm/h prevista, com probabilidade máxima de ${w.prob}%.`,
  hail: hailDescription,
  frost: (w) => `Temperatura mínima prevista de ${round1(w.minTemp)}°C, favorável à formação de geada.`,
};

function summarize(window) {
  const fzls = window.map((r) => r.fzl).filter((v) => v !== null && v > 0);
  return {
    start: window[0].t,
    end: window.at(-1).t + HOUR,
    prob: Math.max(...window.map((r) => r.prob)),
    maxPrecip: Math.max(...window.map((r) => r.precip)),
    maxGust: Math.max(...window.map((r) => r.gust)),
    minTemp: Math.min(...window.map((r) => r.temp)),
    maxCode: Math.max(...window.map((r) => r.code)),
    maxCape: Math.max(...window.map((r) => r.cape)),
    maxHail: Math.max(...window.map((r) => r.hail)),
    minFzl: fzls.length ? Math.min(...fzls) : null,
  };
}

function rainIntensity(mm) {
  if (mm < 2.5) return 'light';
  if (mm < 7.6) return 'moderate';
  if (mm < 20) return 'heavy';
  return 'severe';
}

function classify(type, w) {
  if (type === 'rain') {
    const probability = w.prob || 60;
    const intensity = rainIntensity(w.maxPrecip);
    // Para o veículo, o que importa é o volume: chuva fraca nunca passa de risco baixo.
    const byIntensity = {
      light: 'low',
      moderate: probability >= 60 ? 'moderate' : 'low',
      heavy: probability >= 60 ? 'high' : 'moderate',
      severe: probability >= 70 ? 'extreme' : 'high',
    };
    return { probability, intensity, risk_level: byIntensity[intensity] };
  }
  if (type === 'hail') return hailClassify(w);
  // frost
  const t = w.minTemp;
  if (t <= -2) return { probability: 90, intensity: 'severe', risk_level: 'extreme' };
  if (t <= 0) return { probability: 80, intensity: 'heavy', risk_level: 'high' };
  if (t <= 1.5) return { probability: 60, intensity: 'moderate', risk_level: 'moderate' };
  return { probability: 35, intensity: 'light', risk_level: 'low' };
}

const PREDICATES = {
  rain: (r) => r.prob >= 50 || r.precip >= 1,
  hail: (r) => r.hail >= 1.5,
  frost: (r) => r.temp <= 3,
};

export function buildRiskForecasts(data, location) {
  const now = Date.now() / 1000;
  const future = hourlyRows(data).filter((r) => r.t >= now - HOUR && r.t <= now + 72 * HOUR);
  const forecasts = [];

  for (const type of ['hail', 'rain', 'frost']) {
    const windows = groupWindows(future, PREDICATES[type]).map(summarize).slice(0, 2);

    if (windows.length === 0) {
      // Sem janela de risco: registra um "risco baixo" para o tipo, mantendo a tela informativa.
      const maxHail = Math.max(0, ...future.map((r) => r.hail));
      const baselineProb = {
        rain: Math.max(0, ...future.map((r) => r.prob)),
        hail: maxHail >= 1 ? 10 : maxHail > 0 ? 5 : 1,
        frost: Math.min(...future.map((r) => r.temp)) <= 6 ? 10 : 0,
      }[type];
      forecasts.push({
        type,
        risk_level: 'low',
        probability: Math.min(baselineProb, 35),
        intensity: 'light',
        expected_start: new Date(now * 1000).toISOString(),
        expected_end: new Date((now + 72 * HOUR) * 1000).toISOString(),
        description: type === 'hail'
          ? `Sem instabilidade suficiente para granizo nas próximas 72 horas (CAPE máximo de ${Math.round(Math.max(0, ...future.map((r) => r.cape)))} J/kg).`
          : 'Sem risco significativo nas próximas 72 horas.',
        recommendations: RECOMMENDATIONS[type].low,
        location_name: location.name,
        source: 'open-meteo',
      });
      continue;
    }

    for (const w of windows) {
      const c = classify(type, w);
      forecasts.push({
        type,
        ...c,
        expected_start: new Date(w.start * 1000).toISOString(),
        expected_end: new Date(w.end * 1000).toISOString(),
        description: DESCRIPTIONS[type](w),
        recommendations: RECOMMENDATIONS[type][c.risk_level],
        location_name: location.name,
        source: 'open-meteo',
      });
    }
  }
  return forecasts;
}

// ---------------------------------------------------------------------------
// Alertas (ClimateAlert)
// ---------------------------------------------------------------------------

const TYPE_NAMES = { rain: 'chuva', hail: 'granizo', frost: 'geada', storm: 'tempestade', wind: 'ventania', flood: 'alagamento' };

export function buildAlerts(data, forecasts, location) {
  const now = Date.now() / 1000;
  const rows = hourlyRows(data);
  const base = { location_name: location.name, location_lat: location.lat, location_lng: location.lng, source: 'open-meteo' };
  const alerts = [];

  // 1) Alertas a partir das previsões de risco
  for (const f of forecasts) {
    if (f.risk_level === 'low') continue;
    const severity = { moderate: 'medium', high: 'high', extreme: 'critical' }[f.risk_level];
    const type = f.type === 'rain' && f.intensity === 'severe' ? 'flood' : f.type;
    alerts.push({
      ...base,
      key: `fc:${f.type}:${f.expected_start.slice(0, 13)}`,
      type,
      severity,
      title: `Risco ${severity === 'critical' ? 'extremo' : severity === 'high' ? 'alto' : 'moderado'} de ${TYPE_NAMES[type]}`,
      description: `${f.description} Início previsto: ${formatLocal(f.expected_start, data)}. ${f.recommendations}`,
      timestamp: new Date().toISOString(),
      expected_end: f.expected_end,
      is_active: new Date(f.expected_end).getTime() / 1000 > now,
    });
  }

  // 2) Rajadas de vento fortes previstas (72h)
  const windWindows = groupWindows(rows.filter((r) => r.t >= now && r.t <= now + 72 * HOUR), (r) => r.gust >= 60);
  for (const w of windWindows.map(summarize)) {
    alerts.push({
      ...base,
      key: `wind:${w.start}`,
      type: 'wind',
      severity: w.maxGust >= 80 ? 'high' : 'medium',
      title: `Rajadas de vento de até ${Math.round(w.maxGust)} km/h`,
      description: `Previstas a partir de ${formatLocal(w.start, data)}. Evite estacionar sob árvores, placas ou estruturas soltas. Verifique a fixação dos magnetos da capa.`,
      timestamp: new Date().toISOString(),
      expected_end: new Date(w.end * 1000).toISOString(),
      is_active: true,
    });
  }

  // 3) Eventos observados nas últimas 60h (histórico)
  const past = rows.filter((r) => r.t <= now && r.t > now - 60 * HOUR);
  const stormWindows = groupWindows(past, (r) => r.code >= 95);
  for (const w of stormWindows.map(summarize)) {
    const hail = w.maxCode >= 96 || w.maxHail >= 3;
    // Evento passado estimado: severidade pela força do vento, nunca "crítica"
    // sem confirmação de granizo (código WMO 96/99).
    let severity = w.maxGust >= 60 ? 'high' : 'medium';
    if (w.maxCode >= 96) severity = 'critical';
    else if (hail) severity = 'high';
    alerts.push({
      ...base,
      key: `obs:${hail ? 'hail' : 'storm'}:${w.start}`,
      type: hail ? 'hail' : 'storm',
      severity,
      title: hail ? 'Tempestade com potencial de granizo na região' : 'Tempestade registrada na região',
      description: `Evento em ${formatLocal(w.start, data)}, com rajadas de até ${Math.round(w.maxGust)} km/h. Verifique o veículo e, havendo dano, abra um sinistro no Seguro Inteligente.`,
      timestamp: new Date(w.start * 1000).toISOString(),
      expected_end: new Date(w.end * 1000).toISOString(),
      is_active: false,
    });
  }

  const last24 = past.filter((r) => r.t > now - 24 * HOUR).reduce((s, r) => s + r.precip, 0);
  if (last24 >= 50) {
    const day = new Date().toISOString().slice(0, 10);
    alerts.push({
      ...base,
      key: `obs:flood:${day}`,
      type: 'flood',
      severity: last24 >= 80 ? 'critical' : 'high',
      title: 'Acumulado de chuva elevado — risco de alagamento',
      description: `${Math.round(last24)} mm de chuva nas últimas 24 horas. Evite vias e estacionamentos em áreas baixas.`,
      timestamp: new Date().toISOString(),
      is_active: true,
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Nível de risco de um ponto do trajeto (GpsTracking)
// ---------------------------------------------------------------------------

export function riskFromCondition(condition, wind = 0) {
  const map = { hail: 'critical', storm: 'high', heavy_rain: 'moderate', frost: 'moderate', snow: 'moderate', windy: 'moderate', rain: 'low', fog: 'low' };
  const level = map[condition] || 'safe';
  if (wind >= 70 && (level === 'safe' || level === 'low')) return 'moderate';
  return level;
}

export function readingAt(data, unixTime) {
  const rows = hourlyRows(data);
  let best = rows[0];
  for (const r of rows) if (Math.abs(r.t - unixTime) < Math.abs(best.t - unixTime)) best = r;
  return { ...best, condition: conditionFromCode(best.code, best.temp, best.wind) };
}
