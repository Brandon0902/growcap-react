import {
  HelpCircle,
  Info,
  Loader2,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import { cancelLoanRequest } from '../services/loanService.js';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return 'Reciente';
  const d = new Date(String(dateStr).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const CANCEL_REASONS = [
  'Deseo cambiar el monto o el plazo de pago',
  'Deseo cambiar el esquema de garantía (Ahorro / Aval)',
  'Ya no requiero el financiamiento en este momento',
  'Otro motivo',
];

export default function LoanCancelModal({
  isOpen,
  onClose,
  prestamo,
  loan,
  onSuccess,
}) {
  const currentLoan = prestamo || loan;
  const modalId = useId();
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !currentLoan) return null;

  const planNombre = currentLoan.plan?.nombre || currentLoan.plan?.descripcion || currentLoan.tipo || `Préstamo #${currentLoan.id}`;
  const amount = currentLoan.monto_solicitado ?? currentLoan.cantidad ?? currentLoan.monto ?? 0;
  const hasAval = Boolean(currentLoan.aval_id || currentLoan.aval_nombre || currentLoan.codigo_aval || currentLoan.garantia_tipo === 'AVAL');
  const avalNombre = currentLoan.aval_nombre || (currentLoan.aval_id ? `Aval #${currentLoan.aval_id}` : null);

  const handleConfirmCancel = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      const motivoFinal = selectedReason === 'Otro motivo' && customReason.trim()
        ? `Otro: ${customReason.trim()}`
        : selectedReason;

      const res = await cancelLoanRequest(currentLoan.id, { motivo: motivoFinal });

      if (onSuccess) {
        onSuccess(res?.message || 'La solicitud fue cancelada. Ya puedes iniciar un nuevo trámite si lo requieres.');
      }
      onClose();
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible cancelar la solicitud de préstamo.');
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="records-modal-backdrop"
      style={{
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="records-modal"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          border: '1px solid #e2e8f0',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
      >
        {/* Header sobrio */}
        <div
          style={{
            padding: '18px 22px 14px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <h3 id={`${modalId}-title`} style={{ margin: 0, fontSize: '1.08rem', color: '#0f172a', fontWeight: 600 }}>
              Cancelar solicitud de préstamo
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
              Folio #{currentLoan.id} • {planNombre}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body sobrio */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <Alert type="error">{error}</Alert>}

          {/* Resumen conciso */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Monto solicitado
              </span>
              <strong style={{ display: 'block', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700, marginTop: '2px' }}>
                {formatMoney(amount)} MXN
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Fecha de envío
              </span>
              <span style={{ display: 'block', fontSize: '0.85rem', color: '#334155', fontWeight: 500, marginTop: '2px' }}>
                {formatDate(currentLoan.fecha || currentLoan.fecha_solicitud)}
              </span>
            </div>
          </div>

          {/* Explicación sobria */}
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: '1.55' }}>
            Esta solicitud se encuentra en evaluación y aún no ha sido aprobada ni dispersada. Al cancelarla, el trámite quedará sin efecto y tu cuenta quedará habilitada para solicitar un nuevo préstamo con los montos o plazos que requieras.
          </p>

          {/* Nota discreta de Aval */}
          {hasAval && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                background: '#f1f5f9',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#334155',
                lineHeight: '1.45',
              }}
            >
              <Info size={15} style={{ color: '#64748b', flexShrink: 0, marginTop: '2px' }} />
              <span>
                Por seguridad, el código de aval vinculado {avalNombre ? `(${avalNombre})` : ''} quedará <strong>invalidado definitivamente</strong> para evitar mal uso, y tu compañero quedará libre de este compromiso.
              </span>
            </div>
          )}

          {/* Selector de motivo sobrio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor={`${modalId}-reason`}
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              Motivo de cancelación (opcional)
            </label>

            <select
              id={`${modalId}-reason`}
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.84rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#1e293b',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            >
              {CANCEL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {selectedReason === 'Otro motivo' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Indica el motivo..."
                maxLength={100}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Footer sobrio */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            background: '#fafafa',
          }}
        >
          <Button
            type="button"
            className="button-secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ fontSize: '0.82rem', padding: '7px 14px', minHeight: '34px' }}
          >
            Conservar solicitud
          </Button>

          <Button
            type="button"
            onClick={handleConfirmCancel}
            disabled={isSubmitting}
            style={{
              fontSize: '0.82rem',
              padding: '7px 16px',
              minHeight: '34px',
              background: '#b91c1c',
              borderColor: '#991b1b',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="spin" />
                Cancelando...
              </>
            ) : (
              'Confirmar cancelación'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
