-- SMARTHAIL — agenda a verificação de alertas a cada 30 minutos.
-- Executado uma vez após o deploy da função (substitua __FUNCTION_URL__):
--   https://<project-ref>.supabase.co/functions/v1/check-alerts
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'smarthail-check-alerts';

select cron.schedule(
  'smarthail-check-alerts',
  '*/30 * * * *',
  $job$
    select net.http_post(
      url := '__FUNCTION_URL__',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $job$
);
