import { useEffect, useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import Button from '../../../components/common/Button.jsx';
import {
  isPushSupported,
  getActivePushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  syncPushSubscriptionIfGranted,
} from '../../../services/pushNotificationService.js';
import { requestBadgePermission, setAppBadge, getAppBadgeCount } from '../../../services/appBadgeService.js';

export default function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      const isSupp = isPushSupported();
      setSupported(isSupp);
      if (isSupp) {
        const sub = await getActivePushSubscription();
        setIsSubscribed(Boolean(sub));
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          syncPushSubscriptionIfGranted();
        }
      }
    };
    checkStatus();
  }, []);

  if (!supported) {
    return (
      <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
        Disponible al anclar la app a tu inicio
      </span>
    );
  }

  const handleToggle = async () => {
    setIsLoading(true);
    setStatusMessage('');

    try {
      if (isSubscribed) {
        await unsubscribeFromPushNotifications();
        setIsSubscribed(false);
        setStatusMessage('Notificaciones desactivadas.');
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        const res = await subscribeToPushNotifications();
        if (res.success) {
          setIsSubscribed(true);
          await requestBadgePermission();
          await setAppBadge(getAppBadgeCount());
          setStatusMessage('Notificaciones activadas.');
          setTimeout(() => setStatusMessage(''), 3000);
        } else {
          setStatusMessage(res.message || 'No fue posible activar.');
          setTimeout(() => setStatusMessage(''), 4000);
        }
      }
    } catch {
      setStatusMessage('Error al actualizar preferencia.');
      setTimeout(() => setStatusMessage(''), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
      <Button
        className={isSubscribed ? 'button-secondary icon-button' : 'button-primary icon-button'}
        onClick={handleToggle}
        disabled={isLoading}
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '10px',
          fontWeight: 600,
          fontSize: '0.86rem',
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Actualizando...</span>
          </>
        ) : isSubscribed ? (
          <>
            <Check size={16} style={{ color: '#16a34a' }} />
            <span>Avisos activados</span>
          </>
        ) : (
          <>
            <Bell size={16} />
            <span>Activar avisos</span>
          </>
        )}
      </Button>
      {statusMessage && (
        <span style={{ fontSize: '0.78rem', color: isSubscribed ? '#16a34a' : 'var(--color-text-muted)' }}>
          {statusMessage}
        </span>
      )}
    </div>
  );
}
