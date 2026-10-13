import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import {
  moverSaldoInversion,
  reinvertirInversion,
  solicitarRetiroInversion,
} from '../services/investmentService.js';
import { resetClientNip } from '../../profile/services/profileService.js';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

export default function InvestmentActionModal({
  isOpen,
  mode = 'mover_saldo', // 'mover_saldo' | 'retirar' | 'reinvertir'
  item,
  plans = [],
  onClose,
  onSuccess,
}) {
  const modalId = useId();
  const saldoDisponible = Number(item?.saldo_disponible ?? 0);

  const [amount, setAmount] = useState(String(saldoDisponible > 0 ? saldoDisponible : ''));
  const [nip, setNip] = useState('');
  const [showNip, setShowNip] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(item?.id_activo ? String(item.id_activo) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modo Recuperación / Cambio de NIP
  const [isResettingNip, setIsResettingNip] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetNewNip, setResetNewNip] = useState('');
  const [resetConfirmNip, setResetConfirmNip] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setAmount(String(saldoDisponible > 0 ? saldoDisponible : ''));
      setNip('');
      setShowNip(false);
      setSelectedPlanId(item.id_activo ? String(item.id_activo) : (plans[0]?.id ? String(plans[0].id) : ''));
      setError('');
      setSuccessMsg('');
      setIsResettingNip(false);
      setResetPassword('');
      setResetNewNip('');
      setResetConfirmNip('');
      setResetError('');
      setResetSuccess('');
    }
  }, [isOpen, item, saldoDisponible, plans]);

  const handleResetNipSubmit = async (e) => {
    if (e) e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetPassword) {
      setResetError('Ingresa tu contraseña actual.');
      return;
    }
    if (!resetNewNip || resetNewNip.length < 4) {
      setResetError('El nuevo NIP debe tener entre 4 y 6 dígitos.');
      return;
    }
    if (resetNewNip !== resetConfirmNip) {
      setResetError('Los NIPs no coinciden.');
      return;
    }

    setIsResetSubmitting(true);
    try {
      const res = await resetClientNip({
        current_password: resetPassword,
        nip: resetNewNip,
      });
      setNip(resetNewNip);
      setResetSuccess(res?.message || 'NIP actualizado exitosamente.');
      setTimeout(() => {
        setIsResettingNip(false);
        setResetPassword('');
        setResetNewNip('');
        setResetConfirmNip('');
        setResetSuccess('');
      }, 1000);
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible actualizar el NIP.');
      setResetError(normalized.message);
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId || !plans?.length) return item?.plan || null;
    return plans.find((p) => String(p.id) === String(selectedPlanId)) || item?.plan || null;
  }, [selectedPlanId, plans, item]);

  if (!isOpen || !item) return null;

  const planNombre = item.plan?.nombre || item.nombre || item.plan?.label || `Inversión #${item.id}`;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresa un monto válido mayor a 0.');
      return;
    }

    if (parsedAmount > saldoDisponible) {
      setError(`El monto no puede exceder el saldo disponible liberado (${formatMoney(saldoDisponible)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'mover_saldo') {
        const res = await moverSaldoInversion(item.id, { monto: parsedAmount });
        const msg = res?.data?.message || 'Saldo transferido a cuenta general exitosamente.';
        setSuccessMsg(msg);
        setTimeout(() => {
          onSuccess?.(msg);
          onClose();
        }, 1200);
      } else if (mode === 'retirar') {
        if (!nip || nip.length < 4) {
          setError('Ingresa tu NIP de seguridad de 4 a 6 dígitos.');
          setIsSubmitting(false);
          return;
        }
        const res = await solicitarRetiroInversion(item.id, { monto: parsedAmount, nip });
        const msg = res?.data?.message || 'Solicitud de retiro registrada exitosamente.';
        setSuccessMsg(msg);
        setTimeout(() => {
          onSuccess?.(msg);
          onClose();
        }, 1200);
      } else if (mode === 'reinvertir') {
        const planId = selectedPlanId ? Number(selectedPlanId) : Number(item.id_activo);
        const res = await reinvertirInversion(item.id, {
          monto: parsedAmount,
          id_activo: planId,
        });
        const msg = res?.data?.message || 'Inversión reinvertida exitosamente.';
        setSuccessMsg(msg);
        setTimeout(() => {
          onSuccess?.(msg);
          onClose();
        }, 1200);
      }
    } catch (err) {
      const normalized = normalizeApiError(err, 'Ocurrió un error al procesar la solicitud.');
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHeaderInfo = () => {
    switch (mode) {
      case 'mover_saldo':
        return {
          title: 'Mover a Saldo Disponible',
          icon: <WalletCards size={18} />,
          iconBg: '#f0fdf4',
          iconColor: '#16a34a',
          actionText: 'Mover a Saldo',
        };
      case 'retirar':
        return {
          title: 'Solicitar Retiro Bancario',
          icon: <ArrowRight size={18} />,
          iconBg: '#eff6ff',
          iconColor: '#2563eb',
          actionText: 'Confirmar Retiro',
        };
      case 'reinvertir':
        return {
          title: 'Reinvertir Fondos',
          icon: <RefreshCw size={18} />,
          iconBg: '#faf5ff',
          iconColor: '#9333ea',
          actionText: 'Confirmar Reinversión',
        };
      default:
        return {
          title: 'Gestionar Inversión',
          icon: <WalletCards size={18} />,
          iconBg: '#f0fdf4',
          iconColor: '#16a34a',
          actionText: 'Confirmar',
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: headerInfo.iconBg,
                color: headerInfo.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {headerInfo.icon}
            </div>
            <div>
              <h2
                id={`${modalId}-title`}
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                }}
              >
                {headerInfo.title}
              </h2>
              <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                Póliza #{item.id} · {planNombre}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <Alert type="error">
                <span>{error}</span>
              </Alert>
            )}

            {successMsg && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Saldo Disponible Liberado Badge */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', fontWeight: 600 }}>
                  Saldo liberado disponible
                </span>
                <strong style={{ fontSize: '1.15rem', color: '#16a34a' }}>
                  {formatMoney(saldoDisponible)}
                </strong>
              </div>
              {item.dias_restantes_retiro !== null && item.dias_restantes_retiro !== undefined && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: '#dcfce7',
                    color: '#15803d',
                  }}
                >
                  {item.dias_restantes_retiro} días de gracia
                </span>
              )}
            </div>

            {/* Monto Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor={`${modalId}-monto`} style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                  Monto a operar
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(String(saldoDisponible))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-primary, #6366f1)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Monto total ({formatMoney(saldoDisponible)})
                </button>
              </div>
              <Input
                id={`${modalId}-monto`}
                type="number"
                step="0.01"
                min="1"
                max={saldoDisponible}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Opciones Específicas por Modo */}
            {mode === 'reinvertir' && plans?.length > 0 && (
              <div>
                <label
                  htmlFor={`${modalId}-plan`}
                  style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}
                >
                  Plan de inversión destino
                </label>
                <select
                  id={`${modalId}-plan`}
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    background: '#ffffff',
                    outline: 'none',
                  }}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre || `Plan #${p.id}`} • {p.rendimiento}% anual • {p.periodo || 'Plazo fijo'}
                    </option>
                  ))}
                </select>
                {selectedPlan && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.73rem', color: '#64748b' }}>
                    Tasa: <strong>{selectedPlan.rendimiento}% anual</strong> · Plazo: <strong>{selectedPlan.periodo || 'Plazo estándar'}</strong>
                  </p>
                )}
              </div>
            )}

            {mode === 'retirar' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    htmlFor={`${modalId}-nip`}
                    style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}
                  >
                    NIP de seguridad
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResettingNip(!isResettingNip);
                      setResetError('');
                      setResetSuccess('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '0.72rem',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    {isResettingNip ? 'Volver al retiro' : '¿Olvidaste tu NIP?'}
                  </button>
                </div>

                {!isResettingNip ? (
                  <>
                    <div style={{ position: 'relative' }}>
                      <input
                        id={`${modalId}-nip`}
                        type={showNip ? 'text' : 'password'}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={6}
                        value={nip}
                        onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••"
                        disabled={isSubmitting}
                        required
                        style={{
                          width: '100%',
                          padding: '9px 40px 9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '1rem',
                          fontFamily: 'monospace',
                          letterSpacing: showNip ? '0.1em' : '0.25em',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNip(!showNip)}
                        tabIndex={-1}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                        }}
                        aria-label={showNip ? 'Ocultar NIP' : 'Mostrar NIP'}
                      >
                        {showNip ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      Ingresa tu NIP confidencial de 4 a 6 dígitos para validar la operación.
                    </span>
                  </>
                ) : (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {resetError && <Alert type="danger" message={resetError} />}
                    {resetSuccess && <Alert type="success" message={resetSuccess} />}

                    <div>
                      <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                        Contraseña actual de la cuenta
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showResetPass ? 'text' : 'password'}
                          value={resetPassword}
                          onChange={(e) => setResetPassword(e.target.value)}
                          placeholder="Tu contraseña"
                          disabled={isResetSubmitting}
                          style={{
                            width: '100%',
                            padding: '7px 32px 7px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPass(!showResetPass)}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            padding: '2px',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                          }}
                        >
                          {showResetPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                          Nuevo NIP (4-6 dígitos)
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={resetNewNip}
                          onChange={(e) => setResetNewNip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="••••"
                          disabled={isResetSubmitting}
                          style={{
                            width: '100%',
                            padding: '7px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            letterSpacing: '0.2em',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                          Confirmar NIP
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={6}
                          value={resetConfirmNip}
                          onChange={(e) => setResetConfirmNip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="••••"
                          disabled={isResetSubmitting}
                          style={{
                            width: '100%',
                            padding: '7px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            letterSpacing: '0.2em',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
                      <Button
                        type="button"
                        className="button-primary"
                        onClick={handleResetNipSubmit}
                        disabled={isResetSubmitting || !resetPassword || resetNewNip.length < 4}
                        style={{ fontSize: '0.75rem', padding: '5px 12px', minHeight: '30px' }}
                      >
                        {isResetSubmitting ? 'Guardando...' : 'Guardar NIP'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Texto descriptivo sobrio de una sola línea */}
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
              {mode === 'mover_saldo' && 'Los fondos seleccionados se traspasarán a tu saldo disponible general en caja.'}
              {mode === 'retirar' && 'La solicitud pasará a procesamiento para dispersión a tu cuenta bancaria registrada.'}
              {mode === 'reinvertir' && 'Se activará una póliza con los rendimientos calculados al nuevo plazo contratado.'}
            </p>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <Button
              type="button"
              className="button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ fontSize: '0.8rem', padding: '7px 14px' }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || Number(amount) <= 0 || (mode === 'retirar' && nip.length < 4)}
              style={{
                fontSize: '0.8rem',
                padding: '7px 16px',
                fontWeight: 700,
                background: mode === 'retirar' ? '#2563eb' : (mode === 'reinvertir' ? '#9333ea' : '#16a34a'),
                color: '#ffffff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                headerInfo.actionText
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
