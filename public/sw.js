/* SMARTHAIL — service worker
 * Responsável apenas por notificações push. Não faz cache de páginas,
 * para que o app sempre carregue a versão mais recente publicada.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const scope = self.registration.scope; // ex.: https://smarthail.onrender.com/
  const title = data.title || 'SMARTHAIL';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Novo alerta climático para o seu veículo.',
      icon: `${scope}icons/icon-192.png`,
      badge: `${scope}icons/badge-96.png`,
      tag: data.tag,
      renotify: Boolean(data.tag),
      requireInteraction: data.severity === 'critical',
      data: { url: new URL(data.path || 'alerts-list', scope).href },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.registration.scope;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
