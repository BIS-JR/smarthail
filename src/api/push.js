/**
 * Notificações push (Web Push) — alertas chegam mesmo com o app fechado.
 *
 * Fluxo: o navegador gera uma inscrição (endpoint + chaves), que é salva na
 * tabela `push_subscriptions` junto com a última posição do usuário. A Edge
 * Function `check-alerts` roda a cada 30 min, calcula o risco nessa posição
 * e envia o push para alertas altos/críticos ainda não notificados.
 *
 * Requer o modo nuvem e a chave pública VAPID (VITE_VAPID_PUBLIC_KEY).
 */
import { supabase, isCloud } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const SW_URL = `${import.meta.env.BASE_URL}sw.js`;

function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const browserSupports = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** iPhone/iPad só aceitam push com o app instalado na tela de início. */
export function needsInstallForPush() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  return ios && !standalone;
}

export function isPushAvailable() {
  return isCloud && Boolean(VAPID_PUBLIC_KEY) && browserSupports();
}

export async function registerServiceWorker() {
  if (!browserSupports()) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: import.meta.env.BASE_URL });
  } catch (e) {
    console.warn('Service worker não registrado', e);
    return null;
  }
}

async function currentSubscription() {
  if (!browserSupports()) return null;
  const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  return reg ? reg.pushManager.getSubscription() : null;
}

/** 'unavailable' | 'denied' | 'enabled' | 'disabled' */
export async function getPushStatus() {
  if (!isPushAvailable()) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSubscription();
  return sub && Notification.permission === 'granted' ? 'enabled' : 'disabled';
}

export async function enablePush(location) {
  if (!isPushAvailable()) throw new Error('Notificações não são suportadas neste navegador.');
  if (needsInstallForPush()) {
    throw new Error('No iPhone, adicione o SMARTHAIL à tela de início (Compartilhar → Adicionar à Tela de Início) e ative por lá.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissão de notificação negada no navegador.');

  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY) }));

  const json = sub.toJSON();
  // Recria o registro deste aparelho (o endpoint é único por navegador)
  await supabase.from('push_subscriptions').delete().eq('endpoint', json.endpoint);
  const { error } = await supabase.from('push_subscriptions').insert({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent.slice(0, 250),
    last_lat: location?.lat ?? null,
    last_lng: location?.lng ?? null,
    location_name: location?.name ?? null,
  });
  if (error) throw new Error(error.message);

  await reg.showNotification('SMARTHAIL', {
    body: 'Notificações ativadas. Você será avisado sobre riscos altos para o seu veículo.',
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    tag: 'smarthail-welcome',
  });
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  if (isCloud) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Mantém a posição usada pelo servidor de alertas igual à última sincronização. */
export async function updatePushLocation(location) {
  if (!isPushAvailable() || !location) return;
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase
    .from('push_subscriptions')
    .update({ last_lat: location.lat, last_lng: location.lng, location_name: location.name })
    .eq('endpoint', sub.endpoint);
}
