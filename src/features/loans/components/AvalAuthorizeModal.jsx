import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import { respondAvalRequest } from '../services/loanService.js';
import { resetClientNip } from '../../profile/services/profileService.js';

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

function getInitials(name) {
  if (!name) return 'SO';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AvalAuthorizeModal({
  isOpen,
  onClose,
  request,
  onSuccess,
}) {
  const modalId = useId();

  // Estados de autorización principal
  const [nip, setNip] = useState('');
  const [showNip, setShowNip] = useState(false);
  const [hasNipConfigured, setHasNipConfigured] = useState(request?.aval_has_nip !== false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Estados de declinación
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Estados de recuperación / configuración de NIP
  const [isResettingNip, setIsResettingNip] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetNewNip, setResetNewNip] = useState('');
  const [resetConfirmNip, setResetConfirmNip] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsRejecting(false);
    setIsResettingNip(false);
    setNip('');
    setShowNip(false);
    setRejectReason('');
    setError('');
    setSuccessNotice('');
    setResetPassword('');
    setShowResetPass(false);
    setResetNewNip('');
    setResetConfirmNip('');
    setResetError('');
    setHasNipConfigured(request?.aval_has_nip !== false);
  }, [isOpen, request?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting && !isResetSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, isResetSubmitting, onClose]);

  if (!isOpen || !request) return null;

  const cleanNip = nip.trim();
  const isNipValid = /^\d{4,6}$/.test(cleanNip);

  const handleAuthorize = async () => {
    if (!cleanNip) {
      setError('Ingresa tu NIP de seguridad.');
      return;
    }

    if (!isNipValid) {
      setError('El NIP debe contener entre 4 y 6 dígitos numéricos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setSuccessNotice('');

      const res = await respondAvalRequest(request.id, {
        respuesta: 'autorizar',
        nip: cleanNip,
      });

      if (onSuccess) {
        onSuccess(res?.message || 'Respaldo solidario autorizado.');
      }
      onClose();
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible autorizar la solicitud.');
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      setSuccessNotice('');

      const res = await respondAvalRequest(request.id, {
        respuesta: 'rechazar',
        motivo: rejectReason.trim() || 'Respaldo declinado por el aval.',
      });

      if (onSuccess) {
        onSuccess(res?.message || 'Respaldo declinado.');
      }
      onClose();
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible declinar la solicitud.');
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetNipSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setResetError('');

    if (!resetPassword.trim()) {
      setResetError('Ingresa tu contraseña actual.');
      return;
    }

    const cleanNewNip = resetNewNip.trim();
    if (!cleanNewNip || cleanNewNip.length < 4 || cleanNewNip.length > 6 || !/^\d+$/.test(cleanNewNip)) {
      setResetError('El NIP debe contener entre 4 y 6 dígitos numéricos.');
      return;
    }

    if (cleanNewNip !== resetConfirmNip.trim()) {
      setResetError('Los NIP no coinciden.');
      return;
    }

    try {
      setIsResetSubmitting(true);
      const res = await resetClientNip({
        current_password: resetPassword,
        nip: cleanNewNip,
      });

      setNip(cleanNewNip);
      setHasNipConfigured(true);
      if (request) {
        request.aval_has_nip = true;
      }
      setIsResettingNip(false);
      setResetPassword('');
      setResetNewNip('');
      setResetConfirmNip('');
      setSuccessNotice(res?.message || 'NIP configurado correctamente.');
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible actualizar tu NIP.');
      setResetError(normalized.message);
    } finally {
      setIsResetSubmitting(false);
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
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isResetSubmitting) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="records-modal"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.12), 0 10px 15px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          border: '1px solid #e2e8f0',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
      >
        {/* Header formal e institucional */}
        <div
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: isResettingNip
                  ? '#eff6ff'
                  : isRejecting
                    ? '#fef2f2'
                    : '#f0fdf4',
                color: isResettingNip
                  ? '#2563eb'
                  : isRejecting
                    ? '#dc2626'
                    : '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${
                  isResettingNip
                    ? '#bfdbfe'
                    : isRejecting
                      ? '#fee2e2'
                      : '#bbf7d0'
                }`,
                flexShrink: 0,
              }}
            >
              {isResettingNip ? (
                <KeyRound size={20} />
              ) : isRejecting ? (
                <ShieldAlert size={20} />
              ) : (
                <ShieldCheck size={20} />
              )}
            </div>

            <div>
              <h3
                id={`${modalId}-title`}
                style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 600 }}
              >
                {isResettingNip
                  ? 'Configurar NIP'
                  : isRejecting
                    ? 'Declinar Respaldo de Aval'
                    : 'Autorizar Respaldo de Aval'}
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '1px' }}>
                {isResettingNip
                  ? 'Seguridad de cuenta'
                  : `Solicitud #${request.id} • ${request.solicitante_nombre}`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isResetSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isSubmitting || isResetSubmitting ? 'not-allowed' : 'pointer',
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

        {/* Body sobrio y estructurado */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {error && <Alert type="error">{error}</Alert>}
          {successNotice && <Alert type="success">{successNotice}</Alert>}

          {/* VISTA 1: AUTORIZACIÓN PRINCIPAL */}
          {!isRejecting && !isResettingNip && (
            <>
              {/* Tarjeta de Solicitante */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    flexShrink: 0,
                    letterSpacing: '0.5px',
                  }}
                >
                  {getInitials(request.solicitante_nombre)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.94rem', color: '#0f172a', fontWeight: 600 }}>
                      {request.solicitante_nombre}
                    </strong>
                    {request.solicitante_num_empleado && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontWeight: 500,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        Emp. #{request.solicitante_num_empleado}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {request.solicitante_email || 'Colaborador solicitante'}
                  </span>
                </div>
              </div>

              {/* Grid de Condiciones Financieras (2x2) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                  }}
                >
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', fontWeight: 500 }}>
                    Monto solicitado
                  </span>
                  <strong style={{ fontSize: '1.02rem', color: '#0f172a', fontWeight: 700, display: 'block', marginTop: '3px' }}>
                    {formatMoney(request.monto_solicitado || request.cantidad)} MXN
                  </strong>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                  }}
                >
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', fontWeight: 500 }}>
                    Descuento periódico
                  </span>
                  <strong style={{ fontSize: '1.02rem', color: '#15803d', fontWeight: 700, display: 'block', marginTop: '3px' }}>
                    {formatMoney(request.cuota_fija)} MXN
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: '#166534', display: 'block' }}>
                    Retención {request.recurrencia_pago || 'Semanal'}
                  </span>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                  }}
                >
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', fontWeight: 500 }}>
                    Plazo acordado
                  </span>
                  <span style={{ fontSize: '0.86rem', color: '#1e293b', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                    {request.semanas ? `${request.semanas} semanas` : request.plan_nombre || 'Plazo estándar'}
                  </span>
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                  }}
                >
                  <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', fontWeight: 500 }}>
                    Fecha de registro
                  </span>
                  <span style={{ fontSize: '0.86rem', color: '#1e293b', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                    {formatDate(request.fecha_solicitud || request.fecha)}
                  </span>
                </div>
              </div>

              {/* Nota de Respaldo Solidario */}
              <p style={{ margin: '0 0 -4px', fontSize: '0.76rem', color: '#64748b', lineHeight: '1.4' }}>
                Al autorizar, confirmas tu respaldo como obligado solidario para este crédito.
              </p>

              {/* Sección de Firma Digital con NIP */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {!hasNipConfigured && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <ShieldAlert size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.79rem', color: '#92400e', fontWeight: 500 }}>
                        Requiere NIP de seguridad para autorizar.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setSuccessNotice('');
                        setResetError('');
                        setIsResettingNip(true);
                      }}
                      style={{
                        background: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Configurar NIP
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label
                    htmlFor={`${modalId}-nip`}
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <KeyRound size={15} style={{ color: '#64748b' }} />
                    NIP de seguridad
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    4 a 6 dígitos
                  </span>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id={`${modalId}-nip`}
                    type={showNip ? 'text' : 'tel'}
                    name="security_auth_nip_solidario"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    disabled={isSubmitting}
                    value={nip}
                    onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••"
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '9px 42px 9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '1rem',
                      letterSpacing: showNip ? '0.1em' : '0.25em',
                      fontFamily: 'monospace',
                      outline: 'none',
                      color: '#0f172a',
                      background: '#ffffff',
                      WebkitTextSecurity: showNip ? 'none' : 'disc',
                    }}
                  />
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowNip(!showNip)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showNip ? 'Ocultar NIP' : 'Ver NIP'}
                  >
                    {showNip ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Enlace para Recuperar o Configurar NIP */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessNotice('');
                      setResetError('');
                      setIsResettingNip(true);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '2px 0',
                      textDecoration: 'underline',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <HelpCircle size={13} />
                    {hasNipConfigured ? '¿Olvidaste tu NIP?' : 'Configurar NIP'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* VISTA 2: CONFIGURACIÓN O RECUPERACIÓN DE NIP */}
          {isResettingNip && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Lock size={15} style={{ color: '#475569', flexShrink: 0 }} />
                <span style={{ margin: 0, fontSize: '0.78rem', color: '#475569' }}>
                  Confirma tu contraseña actual para definir tu nuevo NIP.
                </span>
              </div>

              {resetError && <Alert type="error">{resetError}</Alert>}

              {/* Campo Contraseña Actual */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor={`${modalId}-reset-current-pass`}
                  style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}
                >
                  Contraseña actual
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id={`${modalId}-reset-current-pass`}
                    type={showResetPass ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Tu contraseña de acceso..."
                    style={{
                      width: '100%',
                      padding: '9px 40px 9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showResetPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showResetPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Campos Nuevo NIP y Confirmación */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor={`${modalId}-reset-new-nip`}
                    style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}
                  >
                    Nuevo NIP (4-6 dígitos)
                  </label>
                  <input
                    id={`${modalId}-reset-new-nip`}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    value={resetNewNip}
                    onChange={(e) => setResetNewNip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••"
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem',
                      letterSpacing: '0.2em',
                      fontFamily: 'monospace',
                      outline: 'none',
                      WebkitTextSecurity: 'disc',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label
                    htmlFor={`${modalId}-reset-confirm-nip`}
                    style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}
                  >
                    Confirmar NIP
                  </label>
                  <input
                    id={`${modalId}-reset-confirm-nip`}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    value={resetConfirmNip}
                    onChange={(e) => setResetConfirmNip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••"
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem',
                      letterSpacing: '0.2em',
                      fontFamily: 'monospace',
                      outline: 'none',
                      WebkitTextSecurity: 'disc',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VISTA 3: DECLINAR RESPALDO */}
          {isRejecting && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
                <span style={{ margin: 0, fontSize: '0.78rem', color: '#991b1b' }}>
                  Al declinar, la solicitud del titular se cancelará de inmediato.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor={`${modalId}-reject-reason`}
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Motivo (opcional)
                </label>
                <textarea
                  id={`${modalId}-reject-reason`}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Motivo de declinación..."
                  rows={3}
                  maxLength={200}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer sobrio y contextual */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            background: '#fafafa',
          }}
        >
          {/* Footer en Vista de Recuperación de NIP */}
          {isResettingNip ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsResettingNip(false);
                  setResetError('');
                }}
                disabled={isResetSubmitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 4px',
                }}
              >
                <ArrowLeft size={15} />
                Volver
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  type="button"
                  onClick={handleResetNipSubmit}
                  disabled={isResetSubmitting}
                  style={{
                    fontSize: '0.82rem',
                    padding: '7px 18px',
                    minHeight: '34px',
                    background: '#2563eb',
                    borderColor: '#1d4ed8',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                  }}
                >
                  {isResetSubmitting ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      Guardar NIP
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : isRejecting ? (
            /* Footer en Vista de Rechazar */
            <>
              <Button
                type="button"
                className="button-secondary"
                onClick={() => setIsRejecting(false)}
                disabled={isSubmitting}
                style={{ fontSize: '0.82rem', padding: '7px 14px', minHeight: '34px' }}
              >
                Volver
              </Button>

              <Button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                style={{
                  fontSize: '0.82rem',
                  padding: '7px 16px',
                  minHeight: '34px',
                  background: '#dc2626',
                  borderColor: '#b91c1c',
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
                    Declinando...
                  </>
                ) : (
                  'Confirmar declinación'
                )}
              </Button>
            </>
          ) : (
            /* Footer en Vista Principal de Autorización */
            <>
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                disabled={isSubmitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '6px 4px',
                }}
              >
                Declinar respaldo
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  type="button"
                  className="button-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{ fontSize: '0.82rem', padding: '7px 14px', minHeight: '34px' }}
                >
                  Cerrar
                </Button>

                <Button
                  type="button"
                  onClick={handleAuthorize}
                  disabled={isSubmitting || !isNipValid}
                  title={
                    !isNipValid
                      ? 'Ingresa tu NIP de 4 a 6 dígitos'
                      : 'Autorizar respaldo'
                  }
                  style={{
                    fontSize: '0.82rem',
                    padding: '7px 18px',
                    minHeight: '34px',
                    background: '#16a34a',
                    borderColor: '#15803d',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    opacity: (isSubmitting || !isNipValid) ? 0.5 : 1,
                    cursor: (isSubmitting || !isNipValid) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="spin" />
                      Autorizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      Autorizar respaldo
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

