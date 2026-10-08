import { ArrowRight, Bell, Calendar, CheckCircle2, Clock, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../../../components/common/Button.jsx';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function SavingsLifecycleAlertBanner({ items = [], onWithdraw, onTransfer }) {
  const [dismissedMap, setDismissedMap] = useState({});

  const activeAlerts = useMemo(() => {
    const alerts = [];
    const now = new Date();

    for (const it of items) {
      if (dismissedMap[it.id]) continue;
      const planNombre = it.plan?.nombre || it.nombre || it.plan?.label || `Ahorro #${it.id}`;

      // Caso 1: Ventana de Retiro Activa (Prioridad Alta)
      if (it.en_ventana_retiro) {
        alerts.push({
          id: `window-${it.id}`,
          type: 'window',
          item: it,
          planNombre,
          saldoDisponible: Number(it.saldo_disponible ?? 0),
          diasRestantes: it.dias_restantes_retiro ?? 10,
          fechaLimite: it.fecha_limite_retiro,
        });
        continue;
      }

      // Caso 2: Próximo Vencimiento (15 días o menos)
      if (it.fecha_fin) {
        const finDate = new Date(String(it.fecha_fin).replace(' ', 'T'));
        if (!isNaN(finDate.getTime()) && finDate > now) {
          const diffMs = finDate.getTime() - now.getTime();
          const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diasRestantes <= 15) {
            alerts.push({
              id: `upcoming-${it.id}`,
              type: 'upcoming',
              item: it,
              planNombre,
              montoAhorro: Number(it.monto_ahorro ?? 0),
              diasRestantes,
              fechaFin: it.fecha_fin,
            });
          }
        }
      }

      // Caso 3: Aportación voluntaria en proceso de validación por GrowCap
      const montoPendiente = Number(it.monto_pendiente_validacion ?? 0);
      if (montoPendiente > 0) {
        alerts.push({
          id: `pending-deposit-${it.id}`,
          type: 'pending_deposit',
          item: it,
          planNombre,
          montoPendiente,
        });
      }
    }

    return alerts;
  }, [items, dismissedMap]);

  if (activeAlerts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
      {activeAlerts.map((alert) => {
        if (alert.type === 'window') {
          return (
            <div
              key={alert.id}
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1px solid #86efac',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '280px' }}>
                <span
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={18} />
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.92rem', color: '#14532d' }}>
                      ¡Meta cumplida en {alert.planNombre}!
                    </strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      {alert.diasRestantes} {alert.diasRestantes === 1 ? 'día restante' : 'días restantes'}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#166534', lineHeight: 1.4 }}>
                    Tu saldo de <strong>{formatMoney(alert.saldoDisponible)}</strong> está liberado. Tienes hasta el{' '}
                    <strong>{formatDate(alert.fechaLimite)}</strong> para retirar o transferir antes de que se aplique la reinversión automática.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onWithdraw && (
                  <Button
                    type="button"
                    style={{
                      fontSize: '0.78rem',
                      padding: '6px 14px',
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    onClick={() => onWithdraw(alert.item)}
                  >
                    Retirar saldo
                    <ArrowRight size={13} />
                  </Button>
                )}
                {onTransfer && (
                  <Button
                    type="button"
                    className="button-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', borderRadius: '8px' }}
                    onClick={() => onTransfer(alert.item)}
                  >
                    Transferir
                  </Button>
                )}
                <button
                  type="button"
                  aria-label="Descartar aviso"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#15803d',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                  }}
                  onClick={() => setDismissedMap((prev) => ({ ...prev, [alert.item.id]: true }))}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        }

        if (alert.type === 'pending_deposit') {
          return (
            <div
              key={alert.id}
              style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '280px' }}>
                <span
                  style={{
                    background: '#d97706',
                    color: '#ffffff',
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Clock size={18} />
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.92rem', color: '#78350f' }}>
                      Aportación voluntaria en proceso de validación
                    </strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: '#fef3c7',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                      }}
                    >
                      En revisión SPEI
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#92400e', lineHeight: 1.45 }}>
                    Tienes una aportación de <strong>{formatMoney(alert.montoPendiente)}</strong> registrada para tu ahorro <strong>{alert.planNombre}</strong>. El equipo de GrowCap confirmará la transferencia bancaria para acreditar formalmente el saldo a tu meta.
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Descartar aviso"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#92400e',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
                onClick={() => setDismissedMap((prev) => ({ ...prev, [alert.item.id]: true }))}
              >
                <X size={15} />
              </button>
            </div>
          );
        }

        // Alerta preventiva (15 días antes)
        return (
          <div
            key={alert.id}
            style={{
              background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
              border: '1px solid #d8b4fe',
              borderRadius: '12px',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
              <span
                style={{
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  padding: '6px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={16} />
              </span>
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#581c87' }}>
                  Meta próxima a vencer: {alert.planNombre}
                </strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6b21a8' }}>
                  Faltan <strong>{alert.diasRestantes} días</strong> ({formatDate(alert.fechaFin)}). Tu capital acumulado de{' '}
                  <strong>{formatMoney(alert.montoAhorro)}</strong> pasará automáticamente a saldo disponible.
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Descartar aviso"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#7e22ce',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
              }}
              onClick={() => setDismissedMap((prev) => ({ ...prev, [alert.item.id]: true }))}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default SavingsLifecycleAlertBanner;
