/**
 * Acesso às entidades do app — substitui `base44.entities.*`.
 *
 *   api.entities.WeatherData.list('-timestamp', 10)
 *   api.entities.CoverStatus.create({...})
 *
 * Dois modos com a mesma interface:
 *   - nuvem (Supabase): quando VITE_SUPABASE_URL/ANON_KEY estão definidas;
 *     o Row Level Security garante que cada usuário só veja os próprios dados;
 *   - local (localStorage): fallback para desenvolvimento sem backend.
 *
 * Métodos (todos assíncronos): list, filter, get, create, bulkCreate,
 * update, delete, deleteWhere({ eq, lt }).
 */
import { supabase, isCloud } from './supabase';

const PREFIX = 'smarthail';
const SESSION_KEY = `${PREFIX}:session`;

const TABLES = {
  WeatherData: 'weather_data',
  ClimateAlert: 'climate_alerts',
  RiskForecast: 'risk_forecasts',
  GpsTracking: 'gps_tracking',
  InsuranceClaim: 'insurance_claims',
  CoverStatus: 'cover_status',
};

// ---------------------------------------------------------------------------
// Utilitários (também usados pela autenticação local)
// ---------------------------------------------------------------------------

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function localUserId() {
  return readJSON(SESSION_KEY, null)?.userId ?? null;
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function parseSort(sort) {
  if (!sort) return null;
  const desc = sort.startsWith('-');
  return { field: desc ? sort.slice(1) : sort, desc };
}

// ---------------------------------------------------------------------------
// Modo nuvem (Supabase)
// ---------------------------------------------------------------------------

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

function createCloudEntity(name) {
  const table = TABLES[name];
  const from = () => supabase.from(table);

  const select = (query = {}, sort, limit) => {
    let q = from().select('*');
    for (const [k, v] of Object.entries(query)) q = q.eq(k, v);
    const s = parseSort(sort);
    if (s) q = q.order(s.field, { ascending: !s.desc });
    if (limit) q = q.limit(limit);
    return q;
  };

  return {
    name,
    async list(sort = '-created_date', limit) {
      return unwrap(await select({}, sort, limit));
    },
    async filter(query = {}, sort = '-created_date', limit) {
      return unwrap(await select(query, sort, limit));
    },
    async get(id) {
      return unwrap(await from().select('*').eq('id', id).maybeSingle());
    },
    async create(data) {
      return unwrap(await from().insert(data).select().single());
    },
    async bulkCreate(items) {
      if (!items.length) return [];
      return unwrap(await from().insert(items).select());
    },
    async update(id, patch) {
      return unwrap(await from().update(patch).eq('id', id).select().maybeSingle());
    },
    async delete(id) {
      unwrap(await from().delete().eq('id', id));
    },
    async deleteWhere({ eq = {}, lt = {} } = {}) {
      let q = from().delete();
      for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
      for (const [k, v] of Object.entries(lt)) q = q.lt(k, v);
      unwrap(await q);
    },
  };
}

// ---------------------------------------------------------------------------
// Modo local (localStorage)
// ---------------------------------------------------------------------------

const LATENCY_MS = 120; // pequena latência para os estados de carregamento serem perceptíveis
const wait = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));

function compareBy(sort) {
  const s = parseSort(sort);
  if (!s) return () => 0;
  return (a, b) => {
    const va = a[s.field];
    const vb = b[s.field];
    if (va === vb) return 0;
    if (va === undefined || va === null) return 1;
    if (vb === undefined || vb === null) return -1;
    const result = va > vb ? 1 : -1;
    return s.desc ? -result : result;
  };
}

function createLocalEntity(name) {
  const storageKey = () => {
    const userId = localUserId();
    if (!userId) throw new Error('Sessão expirada. Faça login novamente.');
    return `${PREFIX}:${userId}:${name}`;
  };
  const all = () => readJSON(storageKey(), []);
  const save = (rows) => writeJSON(storageKey(), rows);
  const matches = (row, { eq = {}, lt = {} }) =>
    Object.entries(eq).every(([k, v]) => (row[k] ?? false) === v)
    && Object.entries(lt).every(([k, v]) => row[k] !== undefined && row[k] < v);

  return {
    name,
    async list(sort = '-created_date', limit) {
      await wait();
      const rows = [...all()].sort(compareBy(sort));
      return limit ? rows.slice(0, limit) : rows;
    },
    async filter(query = {}, sort = '-created_date', limit) {
      await wait();
      const rows = all().filter((r) => matches(r, { eq: query })).sort(compareBy(sort));
      return limit ? rows.slice(0, limit) : rows;
    },
    async get(id) {
      await wait();
      return all().find((r) => r.id === id) ?? null;
    },
    async create(data) {
      await wait();
      const now = new Date().toISOString();
      const row = { id: uid(), created_date: now, updated_date: now, ...data };
      save([...all(), row]);
      return row;
    },
    async bulkCreate(items) {
      const now = new Date().toISOString();
      const rows = items.map((d) => ({ id: uid(), created_date: now, updated_date: now, ...d }));
      save([...all(), ...rows]);
      return rows;
    },
    async update(id, patch) {
      await wait();
      let updated = null;
      save(all().map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, ...patch, updated_date: new Date().toISOString() };
        return updated;
      }));
      return updated;
    },
    async delete(id) {
      await wait();
      save(all().filter((r) => r.id !== id));
    },
    async deleteWhere(where = {}) {
      save(all().filter((r) => !matches(r, where)));
    },
  };
}

// ---------------------------------------------------------------------------

const createEntity = isCloud ? createCloudEntity : createLocalEntity;

export const entities = Object.fromEntries(Object.keys(TABLES).map((name) => [name, createEntity(name)]));

export { SESSION_KEY, PREFIX };
