// Service Worker para GrowCap Cliente
// Habilita PWA Standalone, Web Push Notifications y Badging API (Safari iOS 16.4+, Android & Desktop)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejo de eventos de Badging desde el frontend y WebKit daemon
self.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SET_BADGE') {
    const count = Math.max(0, parseInt(data.count, 10) || 0);
    try {
      if (count > 0) {
        if ('setAppBadge' in self.navigator) {
          await self.navigator.setAppBadge(count);
        } else if (self.registration && 'setAppBadge' in self.registration) {
          await self.registration.setAppBadge(count);
        }
      } else {
        if ('clearAppBadge' in self.navigator) {
          await self.navigator.clearAppBadge();
        } else if (self.registration && 'clearAppBadge' in self.registration) {
          await self.registration.clearAppBadge();
        }
      }
    } catch (err) {
      console.debug('[SW] Error en Badging message:', err);
    }
  } else if (data.type === 'CLEAR_BADGE') {
    try {
      if ('clearAppBadge' in self.navigator) {
        await self.navigator.clearAppBadge();
      } else if (self.registration && 'clearAppBadge' in self.registration) {
        await self.registration.clearAppBadge();
      }
    } catch (err) {
      console.debug('[SW] Error al limpiar badge:', err);
    }
  }
});

// Evento PUSH: Recibe notificaciones push en segundo plano (incluso con la app cerrada)
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'GrowCap';
  const options = {
    body: payload.body || 'Tienes una nueva actualización en tu cuenta.',
    icon: payload.icon || '/icon-192.png?v=3',
    badge: payload.badge || '/favicon.png?v=3',
    tag: payload.tag || 'growcap-client-alert',
    renotify: true,
    data: {
      url: payload.url || '/',
      timestamp: payload.timestamp || Date.now(),
    },
  };

  const tasks = [
    self.registration.showNotification(title, options),
  ];

  // Sincronizar el globito del icono con el conteo enviado en el payload push
  if (typeof payload.badgeCount === 'number') {
    if (payload.badgeCount > 0 && 'setAppBadge' in self.navigator) {
      tasks.push(self.navigator.setAppBadge(payload.badgeCount).catch(() => {}));
    } else if (payload.badgeCount === 0 && 'clearAppBadge' in self.navigator) {
      tasks.push(self.navigator.clearAppBadge().catch(() => {}));
    }
  }

  event.waitUntil(Promise.all(tasks));
});

// Evento CLICK en la Notificación: Abre la app o enfoca la ventana existente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(urlToOpen) || urlToOpen === '/') {
            return client.focus();
          }
        }
      }
      if (clientList.length > 0 && 'focus' in clientList[0] && 'navigate' in clientList[0]) {
        return clientList[0].navigate(urlToOpen).then((c) => c.focus());
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
