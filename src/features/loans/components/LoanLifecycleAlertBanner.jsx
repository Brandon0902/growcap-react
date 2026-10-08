import {
  AlertCircle,
  Banknote,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  X,
  Eye,
} from 'lucide-react';
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

export default function LoanLifecycleAlertBanner({ items = [], onAbonar, onCancel, onViewRecords }) {
  const [dismissedMap, setDismissedMap] = useState({});

  const activeAlerts = useMemo(() => {
    const alerts = [];

    for (const it of items) {
      if (dismissedMap[it.id]) continue;
      const planNombre = it.plan?.nombre || it.nombre || it.plan?.descripcion || `Préstamo #${it.id}`;
      const statusNum = Number(it.status ?? it.id_status ?? 0);
      const statusStr = String(it.status_label || it.estado || '').toLowerCase();
      const isActive = statusNum === 5 || statusStr.includes('activ') || statusStr.includes('vigent');
      const isPendingReview = statusNum === 2 || statusStr.includes('revis') || statusStr.includes('pend');
      const isLiquidated = statusNum === 1 || statusNum === 6 || statusStr.includes('liquid') || (Number(it.saldo_restante) <= 0.01 && it.saldo_restante !== null && it.saldo_restante !== undefined);
      const montoPendiente = Number(it.monto_pendiente_validacion ?? 0);

      // 1. Pending SPEI Validation Alert
      if (montoPendiente > 0) {
        alerts.push({
          id: `pending-spei-${it.id}`,
          type: 'pending_validation',
          item: it,
          planNombre,
          montoPendiente,
        });
      }

      // 2. Active Loan - Upcoming Payroll Deduction Notification
      if (isActive && Number(it.saldo_restante ?? 0) > 0) {
        alerts.push({
          id: `active-payroll-${it.id}`,
          type: 'active_loan',
          item: it,
          planNombre,
          cuotaFija: Number(it.cuota_fija ?? 0),
          frecuencia: it.frecuencia_pago || 'Semanal',
          saldoRestante: Number(it.saldo_restante ?? 0),
          porcentajePagado: Number(it.porcentaje_pagado ?? 0),
        });
        continue;
      }

      // 2B. Approved - Pending Bank Disbursement
      if (statusNum === 7 || statusStr.includes('dispers') || statusStr.includes('por dispersar')) {
        alerts.push({
          id: `disbursing-${it.id}`,
          type: 'disbursement_pending',
          item: it,
          planNombre,
          montoSolicitado: Number(it.monto_solicitado ?? it.cantidad ?? 0),
          fecha: it.fecha || it.fecha_creacion,
        });
        continue;
      }

      // 3. Pending Review / Waiting Aval Alert
      if (isPendingReview) {
        const isWaitingAval = (Boolean(it.aval_id) || Boolean(it.aval_token)) && (it.aval_status === 0 || it.aval_status === '0');
        alerts.push({
          id: `review-${it.id}`,
          type: isWaitingAval ? 'waiting_aval' : 'review',
          item: it,
          planNombre,
          montoSolicitado: Number(it.monto_solicitado ?? it.cantidad ?? 0),
          fecha: it.fecha,
          avalNombre: it.aval || it.aval_nombre || '',
        });
        continue;
      }

      // 4. Congratulations / Liquidated Alert
      if (isLiquidated) {
        alerts.push({
          id: `liquidated-${it.id}`,
          type: 'liquidated',
          item: it,
          planNombre,
          totalPagado: Number(it.total_adeudo ?? it.monto_pagado ?? 0),
        });
      }
    }

    return alerts;
  }, [items, dismissedMap]);

  if (activeAlerts.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
      {activeAlerts.map((alert) => {
        // Alerta 1: Descuento de Nómina Programado para Préstamo Activo
        if (alert.type === 'active_loan') {
          return (
            <div
              key={alert.id}
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1px solid #86efac',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 320px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#22c55e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Calendar size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#14532d' }}>
                      Próxima Retención de Nómina • {alert.frecuencia}
                    </h4>
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      {alert.porcentajePagado}% pagado
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#166534' }}>
                    Tu cuota programada de <strong>{formatMoney(alert.cuotaFija)} MXN</strong> se retendrá vía nómina de acuerdo con tu recurrencia laboral. Saldo restante:{' '}
                    <strong>{formatMoney(alert.saldoRestante)} MXN</strong>.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onAbonar && (
                  <Button
                    className="button-primary icon-button"
                    style={{
                      fontSize: '0.76rem',
                      padding: '7px 14px',
                      minHeight: '34px',
                      background: '#16a34a',
                      borderColor: '#15803d',
                      boxShadow: '0 1px 3px rgba(22, 163, 74, 0.25)',
                    }}
                    onClick={() => onAbonar(alert.item)}
                  >
                    <Banknote size={15} />
                    Abonar / Liquidar por adelantado
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedMap((prev) => ({ ...prev, [alert.item.id]: true }))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#86efac',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  title="Ocultar aviso"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        }

        // Alerta 2: Abono SPEI en Proceso de Validación
        if (alert.type === 'pending_validation') {
          return (
            <div
              key={alert.id}
              style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fcd34d',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
                <Clock size={20} style={{ color: '#d97706', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#92400e' }}>
                    Abono en Validación • {alert.planNombre}
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#b45309' }}>
                    Tu comprobante SPEI por <strong>{formatMoney(alert.montoPendiente)} MXN</strong> está siendo verificado por administración. Tu saldo restante se actualizará al aprobarse.
                  </p>
                </div>
              </div>
            </div>
          );
        }

        // Alerta 2B: Crédito Autorizado por Comité (En Proceso de Dispersión)
        if (alert.type === 'disbursement_pending') {
          return (
            <div
              key={alert.id}
              style={{
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                border: '1px solid #c4b5fd',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                boxShadow: '0 2px 6px rgba(109, 40, 217, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
                <CheckCircle2 size={20} style={{ color: '#7c3aed', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#5b21b6' }}>
                    Crédito Autorizado por Comité • {alert.planNombre}
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#6d28d9' }}>
                    Tu crédito por <strong>{formatMoney(alert.montoSolicitado)} MXN</strong> fue aprobado. La transferencia bancaria está en proceso de dispersión por tesorería.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onViewRecords && (
                  <Button
                    type="button"
                    variant="outline"
                    className="button-outline"
                    style={{
                      fontSize: '0.76rem',
                      padding: '6px 12px',
                      minHeight: '32px',
                      color: '#6d28d9',
                      borderColor: '#c4b5fd',
                      background: '#ffffff',
                    }}
                    onClick={() => onViewRecords(alert.item)}
                  >
                    <Eye size={14} />
                    Ver detalles
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedMap((prev) => ({ ...prev, [alert.item.id]: true }))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8b5cf6',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  title="Ocultar aviso"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        }

        // Alerta 3A: En Espera de Confirmación de Aval Solidario
        if (alert.type === 'waiting_aval') {
          return (
            <div
              key={alert.id}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={18} style={{ color: '#4338ca' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                      En Espera de Confirmación de tu Aval
                    </h4>
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                      }}
                    >
                      Paso 1 de 2
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#475569' }}>
                    Tu solicitud por <strong>{formatMoney(alert.montoSolicitado)} MXN</strong> ({alert.planNombre}) requiere que tu aval
                    {alert.avalNombre ? <strong> {alert.avalNombre} </strong> : ' asignado '}
                    autorice el respaldo desde su portal antes de ser enviada al comité de crédito.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onViewRecords && (
                  <Button
                    type="button"
                    variant="outline"
                    className="button-outline"
                    style={{
                      fontSize: '0.76rem',
                      padding: '6px 12px',
                      minHeight: '32px',
                      color: '#4338ca',
                      borderColor: '#cbd5e1',
                      background: '#ffffff',
                    }}
                    onClick={() => onViewRecords(alert.item)}
                  >
                    <Eye size={14} />
                    Ver en historial
                  </Button>
                )}
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    className="button-outline"
                    style={{
                      fontSize: '0.76rem',
                      padding: '6px 12px',
                      minHeight: '32px',
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                      background: '#ffffff',
                    }}
                    onClick={() => onCancel(alert.item)}
                  >
                    <X size={14} />
                    Cancelar solicitud
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedMap((prev) => ({ ...prev, [alert.item.id]: true }))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  title="Ocultar aviso"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        }

        // Alerta 3B: Préstamo en Revisión
        if (alert.type === 'review') {
          return (
            <div
              key={alert.id}
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #93c5fd',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
                <Bell size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#1e40af' }}>
                    Solicitud de Préstamo en Revisión
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#1d4ed8' }}>
                    Tu solicitud por <strong>{formatMoney(alert.montoSolicitado)} MXN</strong> ({alert.planNombre}) fue recibida el {formatDate(alert.fecha)} y está en evaluación por el comité de crédito.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onViewRecords && (
                  <Button
                    type="button"
                    variant="outline"
                    className="button-outline"
                    style={{
                      fontSize: '0.76rem',
                      padding: '6px 12px',
                      minHeight: '32px',
                      color: '#1e40af',
                      borderColor: '#93c5fd',
                      background: '#ffffff',
                    }}
                    onClick={() => onViewRecords(alert.item)}
                  >
                    <Eye size={14} />
                    Ver en historial
                  </Button>
                )}
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    className="button-outline"
                    style={{
                      fontSize: '0.76rem',
                      padding: '6px 12px',
                      minHeight: '32px',
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                      background: '#ffffff',
                    }}
                    onClick={() => onCancel(alert.item)}
                  >
                    <X size={14} />
                    Cancelar solicitud
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedMap((prev) => ({ ...prev, [alert.item.id]: true }))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#93c5fd',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  title="Ocultar aviso"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        }

        // Alerta 4: Liquidado con éxito / Felicitaciones
        if (alert.type === 'liquidated') {
          return (
            <div
              key={alert.id}
              style={{
                background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)',
                border: '1px solid #f0abfc',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
                <Sparkles size={20} style={{ color: '#c026d3', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#86198f' }}>
                    ¡Préstamo Liquidado al 100%!
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#a21caf' }}>
                    Completaste con éxito la liquidación de <strong>{alert.planNombre}</strong>. Tu solvencia y puntualidad mejoran tu calificación crediticia institucional.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedMap((prev) => ({ ...prev, [alert.item.id]: true }))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#d946ef',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
