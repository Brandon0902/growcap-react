import { ArrowRight, Clock, RefreshCw, Sparkles, WalletCards, X } from 'lucide-react';
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

function InvestmentLifecycleAlertBanner({
  items = [],
  onMoverSaldo,
  onRetirar,
  onReinvertir,
}) {
  const [dismissedMap, setDismissedMap] = useState({});

  const activeAlerts = useMemo(() => {
    const alerts = [];
    const now = new Date();

    for (const it of items) {
      if (dismissedMap[it.id]) continue;
      const planNombre = it.plan?.nombre || it.nombre || it.plan?.label || `Inversión #${it.id}`;

      // Caso 1: Ventana de Retiro / Gracia Activa (Prioridad Alta)
      if (it.en_ventana_retiro || Number(it.saldo_disponible ?? 0) > 0) {
        alerts.push({
          id: `window-${it.id}`,
          type: 'window',
          item: it,
          planNombre,
          saldoDisponible: Number(it.saldo_disponible ?? 0),
          diasRestantes: it.dias_restantes_retiro ?? it.dias_gracia_retiro ?? 10,
          fechaLimite: it.fecha_limite_retiro,
          autoReinvertir: Boolean(it.auto_reinvertir),
        });
        continue;
      }

      // Caso 2: Próximo Vencimiento (15 días o menos, estado activo = 2)
      if (it.fecha_fin && Number(it.status) === 2) {
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
              capital: Number(it.capital_actual ?? it.cantidad ?? 0),
              diasRestantes,
              fechaFin: it.fecha_fin,
              autoReinvertir: Boolean(it.auto_reinvertir),
            });
          }
        }
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
                      Periodo cumplido · {alert.planNombre}
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
                      {alert.diasRestantes} {alert.diasRestantes === 1 ? 'día de gracia' : 'días de gracia'}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#166534', lineHeight: 1.4 }}>
                    Saldo liberado de <strong>{formatMoney(alert.saldoDisponible)}</strong>. Límite para gestionar:{' '}
                    <strong>{formatDate(alert.fechaLimite) || 'periodo de gracia'}</strong>.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {onMoverSaldo && (
                  <Button
                    type="button"
                    style={{
                      fontSize: '0.78rem',
                      padding: '6px 12px',
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    onClick={() => onMoverSaldo(alert.item)}
                  >
                    <WalletCards size={14} />
                    Mover a saldo
                  </Button>
                )}
                {onRetirar && (
                  <Button
                    type="button"
                    className="button-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', borderRadius: '8px' }}
                    onClick={() => onRetirar(alert.item)}
                  >
                    Retirar
                  </Button>
                )}
                {onReinvertir && (
                  <Button
                    type="button"
                    className="button-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', borderRadius: '8px' }}
                    onClick={() => onReinvertir(alert.item)}
                  >
                    Reinvertir
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

        if (alert.type === 'upcoming') {
          return (
            <div
              key={alert.id}
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '280px' }}>
                <span
                  style={{
                    background: '#2563eb',
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
                    <strong style={{ fontSize: '0.92rem', color: '#1e3a8a' }}>
                      Próximo vencimiento · {alert.planNombre}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      {alert.diasRestantes} {alert.diasRestantes === 1 ? 'día restante' : 'días restantes'}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.4 }}>
                    Vence el <strong>{formatDate(alert.fechaFin)}</strong> ({formatMoney(alert.capital)}).{' '}
                    {alert.autoReinvertir
                      ? 'Renovación automática configurada tras los días de gracia.'
                      : 'Se trasladará a saldo general al concluir los días de gracia.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  aria-label="Descartar aviso"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#1d4ed8',
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

        return null;
      })}
    </div>
  );
}

export default InvestmentLifecycleAlertBanner;
