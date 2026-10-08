import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  HandCoins,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../services/notificationService.js';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} ${diffMin === 1 ? 'min' : 'mins'}`;
  if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'h' : 'hrs'}`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function getNotificationIcon(category, type) {
  const cat = String(category || type || '').toLowerCase();

  if (cat.includes('prestamo')) {
    return {
      icon: <HandCoins size={16} />,
      bg: '#ecfdf5',
      color: '#059669',
    };
  }
  if (cat.includes('ahorro')) {
    return {
      icon: <PiggyBank size={16} />,
      bg: '#faf5ff',
      color: '#9333ea',
    };
  }
  if (cat.includes('inversion')) {
    return {
      icon: <TrendingUp size={16} />,
      bg: '#eff6ff',
      color: '#2563eb',
    };
  }
  if (cat.includes('aval')) {
    return {
      icon: <ShieldCheck size={16} />,
      bg: '#fef3c7',
      color: '#d97706',
    };
  }
  if (cat.includes('rechaz') || cat.includes('cancel')) {
    return {
      icon: <XCircle size={16} />,
      bg: '#fef2f2',
      color: '#dc2626',
    };
  }
  if (cat.includes('aprob') || cat.includes('acredit')) {
    return {
      icon: <CheckCircle2 size={16} />,
      bg: '#f0fdf4',
      color: '#16a34a',
    };
  }

  return {
    icon: <Bell size={16} />,
    bg: '#f1f5f9',
    color: '#64748b',
  };
}

function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifs = async () => {
    try {
      const res = await getNotifications({ limit: 25 });
      setNotifications(res.data || []);
      setUnreadCount(Number(res.unreadCount || 0));
    } catch {
      // Silencioso en caso de error de red
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 45000); // Polling cada 45s
    return () => clearInterval(interval);
  }, []);

  // Cerrar al dar click fuera
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      fetchNotifs();
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true, read_at: new Date() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }

    setIsOpen(false);

    if (notif.url) {
      navigate(notif.url);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date() })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="header-notification-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} no leídas)` : ''}`}
        type="button"
        onClick={handleToggle}
        style={{
          background: isOpen ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          borderRadius: '50%',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.15s ease',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.5)',
              border: '2px solid #ffffff',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Panel de notificaciones"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '340px',
            maxWidth: 'calc(100vw - 24px)',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.8)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '420px',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 4px',
                }}
              >
                <CheckCheck size={14} />
                Marcar leídas
              </button>
            )}
          </div>

          {/* List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '340px',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}
              >
                <Bell size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 500 }}>
                  No tienes notificaciones
                </p>
                <small style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                  Aquí te avisaremos sobre solicitudes y aprobaciones
                </small>
              </div>
            ) : (
              notifications.map((notif) => {
                const iconStyle = getNotificationIcon(notif.category, notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f8fafc',
                      background: notif.is_read ? '#ffffff' : '#f0fdf4',
                      cursor: notif.url ? 'pointer' : 'default',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      transition: 'background 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = notif.is_read ? '#f8fafc' : '#dcfce7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notif.is_read ? '#ffffff' : '#f0fdf4';
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: iconStyle.bg,
                        color: iconStyle.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {iconStyle.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                        <strong
                          style={{
                            fontSize: '0.8rem',
                            color: '#0f172a',
                            fontWeight: notif.is_read ? 600 : 700,
                            lineHeight: 1.3,
                          }}
                        >
                          {notif.title}
                        </strong>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: '3px 0 0',
                          fontSize: '0.75rem',
                          color: '#475569',
                          lineHeight: 1.35,
                          wordBreak: 'break-word',
                        }}
                      >
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notif.is_read && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#16a34a',
                          flexShrink: 0,
                          marginTop: '6px',
                        }}
                        aria-label="No leída"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
