import axiosClient from '../api/axiosClient.js';
import { ENDPOINTS } from '../api/endpoints.js';

/**
 * Convierte una clave VAPID en Base64 URL-safe a Uint8Array requerido por PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Envuelve una promesa con un tiempo límite para evitar cuelgues de WebKit/Safari
 */
function withTimeout(promise, ms, errorMsg = 'Tiempo de espera agotado') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

/**
 * Obtiene el registro activo del Service Worker evitando promesas colgadas
 */
async function getActiveRegistration(timeoutMs = 4000) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  if (reg.active) {
    return reg;
  }

  try {
    const readyReg = await withTimeout(navigator.serviceWorker.ready, timeoutMs, 'Service Worker timeout');
    return readyReg || reg;
  } catch (_) {
    return reg;
  }
}

/**
 * Extrae las claves criptográficas p256dh y auth con tolerancia total a Safari iOS
 */
function extractSubscriptionKeys(subscription) {
  if (!subscription) return { p256dh: null, auth: null };

  let p256dh = null;
  let auth = null;

  if (subscription.getKey) {
    const rawP256dh = subscription.getKey('p256dh');
    if (rawP256dh) {
      const u8 = new Uint8Array(rawP256dh);
      let binary = '';
      for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
      p256dh = btoa(binary);
    }
    const rawAuth = subscription.getKey('auth');
    if (rawAuth) {
      const u8 = new Uint8Array(rawAuth);
      let binary = '';
      for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
      auth = btoa(binary);
    }
  }

  if (!p256dh || !auth) {
    const json = subscription.toJSON ? subscription.toJSON() : {};
    if (json.keys) {
      p256dh = p256dh || json.keys.p256dh;
      auth = auth || json.keys.auth;
    }
  }

  return { p256dh, auth };
}

/**
 * Verifica si el navegador y entorno actual soportan Web Push Notifications.
 * En iOS requiere iOS 16.4+ y que la app esté anclada a la pantalla de inicio (PWA standalone).
 */
export function isPushSupported() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const hasSW = 'serviceWorker' in navigator;
  const hasPush = 'PushManager' in window || (typeof ServiceWorkerRegistration !== 'undefined' && 'pushManager' in ServiceWorkerRegistration.prototype);
  const hasNotif = 'Notification' in window;
  return Boolean(hasSW && hasPush && hasNotif);
}

/**
 * Obtiene la suscripción Web Push activa en el navegador
 */
export async function getActivePushSubscription() {
  if (!isPushSupported()) return null;
  try {
    const registration = await getActiveRegistration(3000);
    if (!registration?.pushManager) return null;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.debug('[PushService] Error obteniendo suscripción activa:', err);
    return null;
  }
}

/**
 * Suscribe al cliente actual a las notificaciones Push de GrowCap
 */
export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    return {
      success: false,
      reason: 'unsupported',
      message: 'Para recibir notificaciones en iPhone, abre la app desde el icono anclado en tu pantalla de inicio.',
    };
  }

  try {
    // 1. Solicitar permiso explícito al usuario si no ha sido otorgado
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await withTimeout(
        Notification.requestPermission(),
        15000,
        'Tiempo de espera agotado al solicitar permisos de notificación'
      );
    }

    if (permission !== 'granted') {
      return {
        success: false,
        reason: 'permission_denied',
        message: 'Permiso no concedido. Puedes activarlo en los Ajustes de tu dispositivo.',
      };
    }

    // 2. Obtener clave pública VAPID desde el backend
    const { data: keyRes } = await withTimeout(
      axiosClient.get(ENDPOINTS.push.publicKey),
      8000,
      'No fue posible obtener las credenciales del servidor'
    );
    const publicKey = keyRes?.publicKey;
    if (!publicKey) {
      throw new Error('No se recibió la clave pública del servidor.');
    }

    // 3. Garantizar que el Service Worker esté activo
    const registration = await getActiveRegistration(4000);
    if (!registration?.pushManager) {
      throw new Error('El gestor de notificaciones no está disponible en este dispositivo.');
    }

    let subscription = await registration.pushManager.getSubscription();
    const convertedKey = urlBase64ToUint8Array(publicKey);

    // 4. Si no existe suscripción previa, suscribirse
    if (!subscription) {
      subscription = await withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        }),
        10000,
        'Tiempo de espera agotado al conectar con el servicio Push de tu dispositivo'
      );
    }

    // 5. Extraer claves criptográficas p256dh y auth
    const { p256dh, auth } = extractSubscriptionKeys(subscription);
    if (!p256dh || !auth) {
      throw new Error('No se pudieron obtener las claves de cifrado del navegador.');
    }

    const subPayload = {
      endpoint: subscription.endpoint,
      keys: { p256dh, auth },
    };

    await withTimeout(
      axiosClient.post(ENDPOINTS.push.subscribe, { subscription: subPayload }),
      8000,
      'Error de comunicación con el servidor al registrar dispositivo'
    );

    return {
      success: true,
      subscription,
      message: 'Notificaciones activadas correctamente.',
    };
  } catch (error) {
    console.error('[PushService] Error suscribiendo a Push:', error);
    return {
      success: false,
      reason: 'error',
      message: error?.response?.data?.message || error?.message || 'No fue posible activar las notificaciones.',
    };
  }
}

/**
 * Si el usuario ya concedió permisos previamente, sincroniza silenciosamente
 * la suscripción Web Push con el backend para garantizar que esté activa en la base de datos.
 */
export async function syncPushSubscriptionIfGranted() {
  if (!isPushSupported()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  try {
    const registration = await getActiveRegistration(3000);
    if (!registration?.pushManager) return;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { data: keyRes } = await axiosClient.get(ENDPOINTS.push.publicKey);
      const publicKey = keyRes?.publicKey;
      if (!publicKey) return;

      const convertedKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    if (subscription) {
      const { p256dh, auth } = extractSubscriptionKeys(subscription);
      if (p256dh && auth) {
        await axiosClient.post(ENDPOINTS.push.subscribe, {
          subscription: {
            endpoint: subscription.endpoint,
            keys: { p256dh, auth },
          },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.debug('[PushService] Sincronización silenciosa en segundo plano:', err?.message);
  }
}

/**
 * Cancela la suscripción Push en el navegador y en el servidor
 */
export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) return { success: true };
  try {
    const registration = await getActiveRegistration(3000);
    if (!registration?.pushManager) return { success: true };

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch(() => {});
      await axiosClient.post(ENDPOINTS.push.unsubscribe, { endpoint }).catch(() => {});
    }
    return { success: true };
  } catch (err) {
    console.error('[PushService] Error al desactivar notificaciones:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Envía una notificación Push de prueba al dispositivo actual
 */
export async function sendTestPushNotification() {
  const { data } = await axiosClient.post(ENDPOINTS.push.test);
  return data;
}
