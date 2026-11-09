/**
 * Ponto único de acesso a dados do app — equivalente ao antigo `base44Client.js`.
 *
 *   import { api } from '@/api/client';
 *   const data = await api.entities.WeatherData.list('-timestamp', 1);
 */
import { entities } from './store';
import { auth } from './auth';
import { isCloud } from './supabase';
import { syncClimate, getSyncMeta, setSyncUser, addDemoData, clearDemoData } from './sync';
import { enablePush, disablePush, getPushStatus, isPushAvailable, needsInstallForPush } from './push';

export const api = {
  mode: isCloud ? 'cloud' : 'local',
  entities,
  auth,
  climate: { sync: syncClimate, meta: getSyncMeta, setUser: setSyncUser, addDemoData, clearDemoData },
  push: { enable: enablePush, disable: disablePush, status: getPushStatus, available: isPushAvailable, needsInstall: needsInstallForPush },
};
