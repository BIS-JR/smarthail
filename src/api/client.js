/**
 * Ponto único de acesso a dados do app — equivalente ao antigo `base44Client.js`.
 *
 *   import { api } from '@/api/client';
 *   const data = await api.entities.WeatherData.list('-timestamp', 1);
 */
import { entities } from './store';
import { auth } from './auth';
import { syncClimate, getSyncMeta, addDemoData, clearDemoData } from './sync';

export const api = {
  entities,
  auth,
  climate: { sync: syncClimate, meta: getSyncMeta, addDemoData, clearDemoData },
};
