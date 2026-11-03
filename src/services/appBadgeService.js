/**
 * Servicio de Badging API para GrowCap Cliente (PWA / Safari iOS).
 * Controla el globo contador (badge) en el icono de la pantalla de inicio en Safari iOS (16.4+),
 * macOS Safari, Chrome, Edge y entornos PWA standalone.
 */

const BADGE_STORAGE_KEY = 'growcap_client_badge_count';
const BADGE_EVENT_NAME = 'growcap:client-badge-changed';
const BASE_APP_TITLE = 'GrowCap';

/**
 * Obtiene el conteo actual almacenado.
 * @returns {number}
 */
export function getAppBadgeCount() {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(BADGE_STORAGE_KEY);
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch (_) {
    return 0;
  }
}

/**
 * Verifica si el navegador actual soporta la Badging API.
 * @returns {boolean}
 */
export function isBadgeSupported() {
  return typeof navigator !== 'undefined' && (
    typeof navigator.setAppBadge === 'function' ||
    typeof navigator.clearAppBadge === 'function'
  );
}

/**
 * Verifica si la aplicación se ejecuta en modo standalone / pantalla de inicio.
 * @returns {boolean}
 */
export function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.navigator?.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
  );
}

/**
 * Solicita permiso de notificaciones en Safari iOS / navegador web.
 * En Safari iOS 16.4+, el globo contador en el icono requiere que el permiso de notificaciones esté concedido.
 * @returns {Promise<boolean>}
 */
export async function requestBadgePermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission === 'default' && typeof Notification.requestPermission === 'function') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch (err) {
    console.debug('[AppBadge] Error al solicitar permisos:', err);
    return false;
  }
}

/**
 * Actualiza el globo contador (badge) del icono web en la pantalla de inicio del dispositivo.
 * @param {number} count Número de elementos pendientes (>= 0)
 * @returns {Promise<number>} Conteo aplicado
 */
export async function setAppBadge(count) {
  const normalizedCount = Math.max(0, Math.floor(Number(count) || 0));

  // 1. Guardar en almacenamiento local para sincronización persistente
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BADGE_STORAGE_KEY, String(normalizedCount));
    } catch (_) {}

    // 2. Notificar a componentes locales
    window.dispatchEvent(
      new CustomEvent(BADGE_EVENT_NAME, {
        detail: { count: normalizedCount },
      })
    );

    // 3. Actualizar título de la pestaña si no está en modo standalone
    if (!isStandaloneApp() && typeof document !== 'undefined') {
      document.title = normalizedCount > 0
        ? `(${normalizedCount}) ${BASE_APP_TITLE}`
        : BASE_APP_TITLE;
    }
  }

  // 4. Intentar API nativa directa navigator.setAppBadge()
  if (isBadgeSupported()) {
    try {
      if (normalizedCount > 0 && typeof navigator.setAppBadge === 'function') {
        await navigator.setAppBadge(normalizedCount);
        return normalizedCount;
      } else if (normalizedCount === 0 && typeof navigator.clearAppBadge === 'function') {
        await navigator.clearAppBadge();
        return 0;
      }
    } catch (directErr) {
      console.debug('[AppBadge] navigator.setAppBadge no pudo aplicarse directamente:', directErr);
    }
  }

  // 5. Delegación al Service Worker (crítico para Safari iOS cuando el tab pasa a background)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      if (reg?.active) {
        reg.active.postMessage({
          type: normalizedCount > 0 ? 'SET_BADGE' : 'CLEAR_BADGE',
          count: normalizedCount,
        });
      }
    } catch (swErr) {
      console.debug('[AppBadge] Error enviando mensaje a Service Worker:', swErr);
    }
  }

  return normalizedCount;
}

/**
 * Limpia el globo contador (badge) del icono web (lo retira por completo).
 */
export async function clearAppBadge() {
  return setAppBadge(0);
}

/**
 * Incrementa el globo contador en el paso indicado.
 * @param {number} [step=1]
 */
export async function incrementAppBadge(step = 1) {
  const current = getAppBadgeCount();
  const next = current + Math.max(1, parseInt(step, 10) || 1);
  return setAppBadge(next);
}

/**
 * Decrementa el globo contador en el paso indicado al leer o procesar una notificación.
 * @param {number} [step=1]
 */
export async function decrementAppBadge(step = 1) {
  const current = getAppBadgeCount();
  const next = Math.max(0, current - Math.max(1, parseInt(step, 10) || 1));
  return setAppBadge(next);
}

/**
 * Sincroniza el globo contador con el total de notificaciones no leídas.
 * @param {number} unreadCount
 */
export async function updateNotificationsBadge(unreadCount) {
  const total = Math.max(0, parseInt(unreadCount, 10) || 0);
  return setAppBadge(total);
}

/**
 * Permite a cualquier componente React suscribirse a los cambios del contador.
 * @param {(count: number) => void} callback
 * @returns {() => void} Función para desuscribirse
 */
export function subscribeToBadgeChanges(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }

  const handler = (event) => {
    const count = event?.detail?.count ?? getAppBadgeCount();
    callback(count);
  };

  window.addEventListener(BADGE_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(BADGE_EVENT_NAME, handler);
  };
}
