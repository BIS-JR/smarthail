/**
 * Integração com a Open-Meteo (https://open-meteo.com) — gratuita e sem chave de API.
 * Converte a resposta bruta em leituras (WeatherData), previsões de risco (RiskForecast)
 * e alertas (ClimateAlert) no formato das entidades do SMARTHAIL.
 */

export const DEFAULT_LOCATION = { lat: -23.5505, lng: -46.6333, name: 'São Paulo, SP' };

const HOUR = 3600;

// ---------------------------------------------------------------------------
// Localização
// ---------------------------------------------------------------------------

export function getDeviceLocation(timeout = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const d = await res.json();
    const city = d.city || d.locality;
    const uf = (d.principalSubdivisionCode || '').split('-')[1] || d.principalSubdivision;
    if (city) return uf ? `${city}, ${uf}` : city;
  } catch {
    /* sem rede ou serviço indisponível: usa coordenadas */
  }
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

// ---------------------------------------------------------------------------
// Open-Meteo
// ---------------------------------------------------------------------------

export async function fetchOpenMeteo(lat, lng) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,pressure_msl,precipitation',
    hourly: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,pressure_msl,precipitation_probability,precipitation',
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

const round1 = (n) => Math.round(n * 10) / 10;

/** Achata a resposta horária em uma lista de objetos. */
function hourlyRows(data) {
  const h = data.hourly;
  return h.time.map((t, i) => ({
    t,
    temp: h.temperature_2m[i],
    humidity: h.relative_humidity_2m[i],
    code: h.weather_code[i],
    wind: h.wind_speed_10m[i],
    gust: h.wind_gusts_10m[i],
    pressure: h.pressure_msl[i],
    prob: h.precipitation_probability[i] ?? 0,
    precip: h.precipitation[i] ?? 0,
  }));
}

function dailyRange(data, t) {
  const { time, temperature_2m_max: max, temperature_2m_min: min } = data.daily;
  const i = time.findIndex((d) => t >= d && t < d + 24 * HOUR);
  return i === -1 ? {} : { temp_min: round1(min[i]), temp_max: round1(max[i]) };
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
    extreme: 'Granizo severo previsto: infle a capa imediatamente e evite circular durante o evento.',
  },
  frost: {
    low: 'Sem ação necessária.',
    moderate: 'Proteja o para-brisa durante a madrugada; a capa reduz a formação de gelo.',
    high: 'Infle a capa à noite e evite usar água quente para descongelar os vidros.',
    extreme: 'Geada forte: mantenha o veículo coberto e verifique a bateria pela manhã.',
  },
};

const DESCRIPTIONS = {
  rain: (w) => `Precipitação de até ${round1(w.maxPrecip)} mm/h prevista, com probabilidade máxima de ${w.prob}%.`,
  hail: (w) => `Tempestade com potencial de granizo${w.maxGust ? ` e rajadas de até ${Math.round(w.maxGust)} km/h` : ''}.`,
  frost: (w) => `Temperatura mínima prevista de ${round1(w.minTemp)}°C, favorável à formação de geada.`,
};

function summarize(window) {
  return {
    start: window[0].t,
    end: window.at(-1).t + HOUR,
    prob: Math.max(...window.map((r) => r.prob)),
    maxPrecip: Math.max(...window.map((r) => r.precip)),
    maxGust: Math.max(...window.map((r) => r.gust)),
    minTemp: Math.min(...window.map((r) => r.temp)),
    maxCode: Math.max(...window.map((r) => r.code)),
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
  if (type === 'hail') {
    if (w.maxCode === 99) return { probability: 85, intensity: 'severe', risk_level: 'extreme' };
    if (w.maxCode === 96) return { probability: 70, intensity: 'heavy', risk_level: 'high' };
    return { probability: 45, intensity: 'moderate', risk_level: 'moderate' };
  }
  // frost
  const t = w.minTemp;
  if (t <= -2) return { probability: 90, intensity: 'severe', risk_level: 'extreme' };
  if (t <= 0) return { probability: 80, intensity: 'heavy', risk_level: 'high' };
  if (t <= 1.5) return { probability: 60, intensity: 'moderate', risk_level: 'moderate' };
  return { probability: 35, intensity: 'light', risk_level: 'low' };
}

const PREDICATES = {
  rain: (r) => r.prob >= 50 || r.precip >= 1,
  hail: (r) => r.code === 96 || r.code === 99 || (r.code === 95 && r.gust >= 70),
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
      const baselineProb = {
        rain: Math.max(0, ...future.map((r) => r.prob)),
        hail: future.some((r) => r.code === 95) ? 15 : 2,
        frost: Math.min(...future.map((r) => r.temp)) <= 6 ? 10 : 0,
      }[type];
      forecasts.push({
        type,
        risk_level: 'low',
        probability: Math.min(baselineProb, 35),
        intensity: 'light',
        expected_start: new Date(now * 1000).toISOString(),
        expected_end: new Date((now + 72 * HOUR) * 1000).toISOString(),
        description: 'Sem risco significativo nas próximas 72 horas.',
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
    const start = new Date(f.expected_start);
    alerts.push({
      ...base,
      key: `fc:${f.type}:${f.expected_start.slice(0, 13)}`,
      type,
      severity,
      title: `Risco ${severity === 'critical' ? 'extremo' : severity === 'high' ? 'alto' : 'moderado'} de ${TYPE_NAMES[type]}`,
      description: `${f.description} Início previsto: ${start.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}. ${f.recommendations}`,
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
      description: 'Evite estacionar sob árvores, placas ou estruturas soltas. Verifique a fixação dos magnetos da capa.',
      timestamp: new Date().toISOString(),
      expected_end: new Date(w.end * 1000).toISOString(),
      is_active: true,
    });
  }

  // 3) Eventos observados nas últimas 60h (histórico)
  const past = rows.filter((r) => r.t <= now && r.t > now - 60 * HOUR);
  const stormWindows = groupWindows(past, (r) => r.code >= 95);
  for (const w of stormWindows.map(summarize)) {
    const hail = w.maxCode >= 96;
    alerts.push({
      ...base,
      key: `obs:${hail ? 'hail' : 'storm'}:${w.start}`,
      type: hail ? 'hail' : 'storm',
      severity: hail ? 'critical' : 'high',
      title: hail ? 'Granizo registrado na região' : 'Tempestade registrada na região',
      description: `Evento observado com rajadas de até ${Math.round(w.maxGust)} km/h. Verifique o veículo e, havendo dano, abra um sinistro no Seguro Inteligente.`,
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
