-- SMARTHAIL — esquema inicial
-- Uma tabela por entidade do app. Toda linha pertence a um usuário (user_id)
-- e o Row Level Security garante que cada pessoa só acesse os próprios dados.

-- ---------------------------------------------------------------------------
-- Função utilitária: mantém updated_date atualizado
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- WeatherData — leituras meteorológicas
-- ---------------------------------------------------------------------------
create table public.weather_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  "timestamp" timestamptz not null,
  temperature real not null,
  temp_min real,
  temp_max real,
  condition text not null,
  humidity real,
  wind_speed real,
  pressure real,
  precipitation real,
  location_lat double precision,
  location_lng double precision,
  location_name text,
  source text,
  demo boolean not null default false
);
create index weather_data_user_ts on public.weather_data (user_id, "timestamp" desc);

-- ---------------------------------------------------------------------------
-- ClimateAlert — alertas de eventos extremos
-- ---------------------------------------------------------------------------
create table public.climate_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  key text,
  title text not null,
  description text,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  type text not null check (type in ('rain', 'hail', 'frost', 'storm', 'wind', 'flood')),
  "timestamp" timestamptz not null,
  expected_end timestamptz,
  is_active boolean not null default true,
  location_name text,
  location_lat double precision,
  location_lng double precision,
  source text,
  demo boolean not null default false,
  notified_at timestamptz,
  unique (user_id, key)
);
create index climate_alerts_user_ts on public.climate_alerts (user_id, "timestamp" desc);

-- ---------------------------------------------------------------------------
-- RiskForecast — previsões de risco
-- ---------------------------------------------------------------------------
create table public.risk_forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  type text not null check (type in ('rain', 'hail', 'frost')),
  risk_level text not null check (risk_level in ('low', 'moderate', 'high', 'extreme')),
  probability real not null,
  intensity text check (intensity in ('light', 'moderate', 'heavy', 'severe')),
  expected_start timestamptz not null,
  expected_end timestamptz,
  description text,
  recommendations text,
  location_name text,
  source text,
  demo boolean not null default false
);
create index risk_forecasts_user_start on public.risk_forecasts (user_id, expected_start);

-- ---------------------------------------------------------------------------
-- GpsTracking — pontos do trajeto
-- ---------------------------------------------------------------------------
create table public.gps_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  "timestamp" timestamptz not null,
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  risk_level text check (risk_level in ('safe', 'low', 'moderate', 'high', 'critical')),
  demo boolean not null default false
);
create index gps_tracking_user_ts on public.gps_tracking (user_id, "timestamp" desc);

-- ---------------------------------------------------------------------------
-- InsuranceClaim — sinistros
-- ---------------------------------------------------------------------------
create table public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  incident_date timestamptz not null,
  location_lat double precision,
  location_lng double precision,
  location_name text,
  impact_intensity text not null check (impact_intensity in ('light', 'moderate', 'heavy', 'severe')),
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'submitted', 'approved', 'rejected')),
  weather_condition text,
  damage_photos text[],
  confirmed boolean not null default false,
  insurer_sent boolean not null default false,
  report_summary text,
  demo boolean not null default false
);
create index insurance_claims_user_date on public.insurance_claims (user_id, incident_date desc);

-- ---------------------------------------------------------------------------
-- CoverStatus — log de ações da capa (o estado atual é o registro mais recente)
-- ---------------------------------------------------------------------------
create table public.cover_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  "timestamp" timestamptz not null,
  is_inflated boolean not null default false,
  magnets_status text not null default 'all_attached' check (magnets_status in ('all_attached', 'partial', 'detached')),
  integrity text not null default 'perfect' check (integrity in ('perfect', 'good', 'warning', 'critical')),
  battery_level real,
  last_action text check (last_action in ('inflate', 'deflate', 'check', 'emergency_deploy')),
  action_by text,
  notes text,
  demo boolean not null default false
);
create index cover_status_user_ts on public.cover_status (user_id, "timestamp" desc);

-- ---------------------------------------------------------------------------
-- Inscrições de notificação push (Web Push) + última posição conhecida
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_lat double precision,
  last_lng double precision,
  location_name text
);
create index push_subscriptions_user on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Controle interno de execuções da Edge Function (não exposto aos usuários)
-- ---------------------------------------------------------------------------
create table public.function_runs (
  name text primary key,
  last_run_at timestamptz not null default now(),
  last_result jsonb
);
alter table public.function_runs enable row level security;
revoke all on public.function_runs from anon, authenticated;
-- Sem políticas: apenas a service role (Edge Function) acessa.

-- ---------------------------------------------------------------------------
-- Triggers e Row Level Security para as tabelas de usuário
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'weather_data', 'climate_alerts', 'risk_forecasts', 'gps_tracking',
    'insurance_claims', 'cover_status', 'push_subscriptions'
  ]
  loop
    execute format(
      'create trigger touch_updated_date before update on public.%I
         for each row execute function public.touch_updated_date()', t);

    execute format('alter table public.%I enable row level security', t);

    -- Permissão explícita (projetos novos não expõem tabelas à API por padrão);
    -- o RLS abaixo restringe a cada usuário as próprias linhas.
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);

    execute format(
      'create policy "Usuário acessa os próprios dados" on public.%I
         for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;
