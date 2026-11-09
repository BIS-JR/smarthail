/**
 * Armazenamento local de entidades — substitui `base44.entities.*`.
 *
 * Mantém a mesma interface usada no protótipo Base44:
 *   api.entities.WeatherData.list('-timestamp', 10)
 *   api.entities.CoverStatus.create({...})
 *
 * Os dados ficam no localStorage, separados por usuário. Para migrar para um
 * backend real (Supabase, Firebase, API própria), basta reimplementar
 * `createEntity` mantendo os mesmos métodos.
 */

const PREFIX = 'smarthail';
const SESSION_KEY = `${PREFIX}:session`;

const LATENCY_MS = 120; // pequena latência para os estados de carregamento serem perceptíveis
const wait = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));

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

export function currentUserId() {
  return readJSON(SESSION_KEY, null)?.userId ?? null;
}

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function compareBy(sort) {
  if (!sort) return () => 0;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return (a, b) => {
    const va = a[field];
    const vb = b[field];
    if (va === vb) return 0;
    if (va === undefined || va === null) return 1;
    if (vb === undefined || vb === null) return -1;
    const result = va > vb ? 1 : -1;
    return desc ? -result : result;
  };
}

function createEntity(name) {
  const storageKey = () => {
    const userId = currentUserId();
    if (!userId) throw new Error('Sessão expirada. Faça login novamente.');
    return `${PREFIX}:${userId}:${name}`;
  };
  const all = () => readJSON(storageKey(), []);
  const save = (rows) => writeJSON(storageKey(), rows);

  return {
    name,

    /** Lista registros. `sort` no formato '-campo' (desc) ou 'campo' (asc). */
    async list(sort = '-created_date', limit) {
      await wait();
      const rows = [...all()].sort(compareBy(sort));
      return limit ? rows.slice(0, limit) : rows;
    },

    /** Filtra por igualdade de campos (ou função predicado). */
    async filter(query = {}, sort = '-created_date', limit) {
      await wait();
      const match = typeof query === 'function'
        ? query
        : (row) => Object.entries(query).every(([k, v]) => row[k] === v);
      const rows = all().filter(match).sort(compareBy(sort));
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

    /** Remove registros que satisfazem o predicado (uso interno da sincronização). */
    removeWhere(predicate) {
      save(all().filter((r) => !predicate(r)));
    },

    /** Leitura síncrona sem latência (uso interno). */
    snapshot() {
      return all();
    },
  };
}

export const entities = {
  WeatherData: createEntity('WeatherData'),
  ClimateAlert: createEntity('ClimateAlert'),
  RiskForecast: createEntity('RiskForecast'),
  GpsTracking: createEntity('GpsTracking'),
  InsuranceClaim: createEntity('InsuranceClaim'),
  CoverStatus: createEntity('CoverStatus'),
};

export { SESSION_KEY, PREFIX };
