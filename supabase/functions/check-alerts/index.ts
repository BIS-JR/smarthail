// SMARTHAIL — check-alerts
//
// Executada pelo pg_cron a cada 30 minutos. Para cada usuário com notificações
// ativas: busca a previsão na última posição conhecida, calcula riscos e alertas
// com o mesmo núcleo do app (_shared/climate.js), grava os alertas e envia
// Web Push para os de severidade alta/crítica ainda não notificados.
//
// Segredos necessários (supabase secrets set):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ex.: mailto:voce@email.com)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são fornecidos automaticamente.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { fetchOpenMeteo, buildRiskForecasts, buildAlerts } from '../_shared/climate.js';

const MIN_INTERVAL_MS = 10 * 60 * 1000; // protege contra chamadas repetidas
const NOTIFY_SEVERITIES = new Set(['high', 'critical']);

type Subscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  last_lat: number;
  last_lng: number;
  location_name: string | null;
  updated_date: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const force = new URL(req.url).searchParams.get('force') === '1'
    && req.headers.get('Authorization') === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // 1) Intervalo mínimo entre execuções
  const { data: lastRun } = await supabase.from('function_runs').select('last_run_at').eq('name', 'check-alerts').maybeSingle();
  if (!force && lastRun && Date.now() - new Date(lastRun.last_run_at).getTime() < MIN_INTERVAL_MS) {
    return json({ skipped: true, reason: 'executada há menos de 10 minutos' });
  }
  await supabase.from('function_runs').upsert({ name: 'check-alerts', last_run_at: new Date().toISOString() });

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@smarthail.app',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  // 2) Inscrições com posição conhecida, agrupadas por usuário
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id,user_id,endpoint,p256dh,auth,last_lat,last_lng,location_name,updated_date')
    .not('last_lat', 'is', null);
  if (error) return json({ error: error.message }, 500);

  const byUser = new Map<string, Subscription[]>();
  for (const s of (subs ?? []) as Subscription[]) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
    byUser.get(s.user_id)!.push(s);
  }

  const weatherCache = new Map<string, unknown>(); // usuários próximos compartilham a consulta
  const stats = { users: 0, alerts: 0, sent: 0, removed: 0, errors: [] as string[] };

  for (const [userId, userSubs] of byUser) {
    try {
      // Posição mais recente entre os aparelhos do usuário
      const s0 = [...userSubs].sort((a, b) => b.updated_date.localeCompare(a.updated_date))[0];
      const location = { lat: s0.last_lat, lng: s0.last_lng, name: s0.location_name ?? 'Sua localização' };
      const cacheKey = `${location.lat.toFixed(2)},${location.lng.toFixed(2)}`;
      let data = weatherCache.get(cacheKey);
      if (!data) {
        data = await fetchOpenMeteo(location.lat, location.lng);
        weatherCache.set(cacheKey, data);
      }

      const forecasts = buildRiskForecasts(data, location);
      const alerts = buildAlerts(data, forecasts, location);
      stats.users++;
      stats.alerts += alerts.length;
      if (!alerts.length) continue;

      // 3) Grava/atualiza alertas por chave
      const { data: existing } = await supabase
        .from('climate_alerts')
        .select('id,key,notified_at')
        .eq('user_id', userId)
        .in('key', alerts.map((a) => a.key));
      const byKey = new Map((existing ?? []).map((e) => [e.key, e]));

      const toNotify: Array<Record<string, unknown>> = [];
      for (const alert of alerts) {
        let row = byKey.get(alert.key);
        if (row) {
          const { timestamp: _keepOriginal, ...rest } = alert;
          await supabase.from('climate_alerts').update(rest).eq('id', row.id);
        } else {
          const { data: inserted, error: insErr } = await supabase
            .from('climate_alerts')
            .insert({ ...alert, user_id: userId })
            .select('id,key,notified_at')
            .single();
          if (insErr) continue; // criado pelo app no mesmo instante
          row = inserted;
        }
        if (alert.is_active && NOTIFY_SEVERITIES.has(alert.severity) && !row!.notified_at) {
          toNotify.push({ ...alert, id: row!.id });
        }
      }

      // 4) Envia push para cada aparelho do usuário
      for (const alert of toNotify) {
        const payload = JSON.stringify({
          title: alert.title,
          body: String(alert.description).slice(0, 180),
          tag: alert.key,
          severity: alert.severity,
          path: 'alerts-list',
        });
        let delivered = false;
        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { TTL: 6 * 3600, urgency: alert.severity === 'critical' ? 'high' : 'normal' },
            );
            delivered = true;
            stats.sent++;
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) {
              // Inscrição expirada ou revogada pelo navegador
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
              stats.removed++;
            } else {
              stats.errors.push(`push ${status ?? (e as Error).message}`);
            }
          }
        }
        if (delivered) {
          await supabase.from('climate_alerts').update({ notified_at: new Date().toISOString() }).eq('id', alert.id);
        }
      }
    } catch (e) {
      stats.errors.push((e as Error).message);
    }
  }

  const result = { ...stats, errors: stats.errors.slice(0, 10), at: new Date().toISOString() };
  await supabase.from('function_runs').update({ last_result: result }).eq('name', 'check-alerts');
  return json(result);
});
