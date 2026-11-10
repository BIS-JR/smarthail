// SMARTHAIL — inmet-alerts
//
// Chamada pelo app (usuário logado) a cada sincronização: devolve os avisos
// oficiais do INMET que cobrem a posição informada. O INMET não libera CORS,
// por isso o navegador não pode consultá-lo diretamente.
//
// POST { lat, lng, name? } → { alerts: ClimateAlert[] }

import { fetchInmetWarnings, inmetAlertsFor } from '../_shared/inmet.js';

const CACHE_MS = 10 * 60 * 1000;
let cache: { at: number; warnings: Awaited<ReturnType<typeof fetchInmetWarnings>> } | null = null;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let body: { lat?: number; lng?: number; name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  const { lat, lng, name } = body;
  if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return json({ error: 'Informe lat e lng numéricos' }, 400);
  }

  try {
    if (!cache || Date.now() - cache.at > CACHE_MS) {
      cache = { at: Date.now(), warnings: await fetchInmetWarnings() };
    }
    const alerts = inmetAlertsFor(cache.warnings, { lat, lng, name: name ?? '' });
    return json({ alerts, total_brasil: cache.warnings.length });
  } catch (e) {
    return json({ error: (e as Error).message, alerts: [] }, 502);
  }
});
