import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import { solicitarRetiroSaldoGeneral } from '../services/dashboardService.js';
import { getMyProfileData, resetClientNip } from '../../profile/services/profileService.js';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

export default function GeneralWithdrawalModal({
  isOpen,
  onClose,
  availableBalance = 0,
  availableAccounts = [],
  onSuccess,
}) {
  const modalId = useId();
  const accountsList = Array.isArray(availableAccounts) ? availableAccounts.filter((a) => Number(a?.saldo_disponible) > 0) : [];

  const [selectedAccountKey, setSelectedAccountKey] = useState('');
  const [amount, setAmount] = useState('');
  const [nip, setNip] = useState('');
  const [showNip, setShowNip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Perfil bancario
  const [bankInfo, setBankInfo] = useState({ banco: '', cuenta: '' });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Modo Recuperación / Cambio de NIP
  const [isResettingNip, setIsResettingNip] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetNewNip, setResetNewNip] = useState('');
  const [resetConfirmNip, setResetConfirmNip] = useState('');
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const selectedAccount = accountsList.find((a) => a.key === selectedAccountKey) || accountsList[0] || null;
  const maxAvailable = selectedAccount
    ? Number(selectedAccount.saldo_disponible ?? 0)
    : Number(availableBalance ?? 0);

  useEffect(() => {
    if (isOpen) {
      const initialAcc = accountsList[0] || null;
      const initialMax = initialAcc ? Number(initialAcc.saldo_disponible ?? 0) : Number(availableBalance ?? 0);
      setSelectedAccountKey(initialAcc ? initialAcc.key : '');
      setAmount(initialMax > 0 ? String(initialMax) : '');
      setNip('');
      setShowNip(false);
      setError('');
      setSuccessMsg('');
      setIsResettingNip(false);
      setResetPassword('');
      setResetNewNip('');
      setResetConfirmNip('');
      setResetError('');
      setResetSuccess('');

      // Cargar datos de cuenta destino
      setIsLoadingProfile(true);
      getMyProfileData()
        .then((res) => {
          const u = res?.data?.user_data || res?.data || {};
          setBankInfo({
            banco: u.banco || 'Cuenta Bancaria Registrada',
            cuenta: u.cuenta || 'CLABE configurada en perfil',
          });
        })
        .catch(() => {
          setBankInfo({
            banco: 'Cuenta Bancaria Registrada',
            cuenta: 'CLABE registrada',
          });
        })
        .finally(() => setIsLoadingProfile(false));
    }
  }, [isOpen, availableBalance]);

  if (!isOpen) return null;

  const handleAccountChange = (newKey) => {
    setSelectedAccountKey(newKey);
    const found = accountsList.find((a) => a.key === newKey);
    if (found) {
      setAmount(String(Number(found.saldo_disponible ?? 0)));
    }
    setError('');
  };

  const handleQuickPercent = (pct) => {
    const val = Number(((maxAvailable * pct) / 100).toFixed(2));
    setAmount(String(val));
    setError('');
  };

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

  const handleSubmitWithdrawal = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresa un monto válido mayor a 0.');
      return;
    }
    if (parsedAmount > maxAvailable) {
      setError(`El monto no puede superar el saldo disponible de la cuenta seleccionada (${formatMoney(maxAvailable)}).`);
      return;
    }
    if (!nip || nip.length < 4) {
      setError('Ingresa tu NIP confidencial de 4 a 6 dígitos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await solicitarRetiroSaldoGeneral({
        monto: parsedAmount,
        nip,
        origen_tipo: selectedAccount?.origen_tipo,
        origen_id: selectedAccount?.id,
      });
      const defaultMsg = (() => {
        const tipo = selectedAccount?.origen_tipo;
        if (tipo === 'inversion') {
          return 'Solicitud realizada con éxito. Verás el depósito reflejado en tu cuenta en un máximo de 15 días hábiles.';
        }
        if (tipo === 'ahorro') {
          const nombre = String(selectedAccount?.label || selectedAccount?.nombre || '').toLowerCase();
          if (nombre.includes('siempre disponible')) {
            return 'Solicitud realizada con éxito. Verás el depósito reflejado en tu cuenta en un lapso de 24 a 48 hrs hábiles.';
          }
          return 'Solicitud realizada con éxito. Tu retiro se pagará en el periodo de nómina siguiente a la semana de tu solicitud (no se paga en la semana en curso).';
        }
        return 'Solicitud realizada con éxito. Verás el depósito reflejado en tu cuenta en un lapso de 24 a 48 hrs hábiles.';
      })();
      const msg = res?.data?.message || res?.message || defaultMsg;
      onSuccess?.(msg);
      onClose();
    } catch (err) {
      const normalized = normalizeApiError(err, 'Ocurrió un error al procesar el retiro.');
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="action-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 99999,
      }}
      role="presentation"
    >
      <div
        className="action-modal-container"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
      >
        {/* Cabecera */}
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
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: successMsg ? '#dcfce7' : '#fee2e2',
                color: successMsg ? '#15803d' : '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {successMsg ? <CheckCircle2 size={18} /> : <WalletCards size={18} />}
            </div>
            <div>
              <h3 id={`${modalId}-title`} style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                {successMsg ? 'Solicitud Registrada' : 'Retiro de Saldo Disponible'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                Transferencia bancaria a tu cuenta registrada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isResetSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
            }}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '20px' }}>
          {error && (
            <Alert type="error" style={{ marginBottom: '16px' }}>
              {error}
            </Alert>
          )}

          {successMsg ? (
            <div style={{ textAlign: 'center', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '1.02rem', fontWeight: 700, color: '#0f172a' }}>
                  Solicitud realizada con éxito
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.45 }}>
                  {successMsg ? successMsg.replace(/^Solicitud realizada con éxito\.\s*/i, '') : 'Tu solicitud se encuentra en proceso de dispersión.'}
                </p>
              </div>
              <div
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  color: '#334155',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Monto solicitado:</span>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{formatMoney(amount)}</strong>
              </div>
              <Button
                type="button"
                className="button-primary"
                onClick={onClose}
                style={{ width: '100%', minHeight: '38px', fontSize: '0.84rem', marginTop: '4px' }}
              >
                Entendido
              </Button>
            </div>
          ) : !isResettingNip ? (
            <form onSubmit={handleSubmitWithdrawal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Selector de Cuenta de Origen */}
              {accountsList.length > 0 && (
                <div>
                  <label
                    htmlFor={`${modalId}-source-account`}
                    style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}
                  >
                    Cuenta de origen
                  </label>
                  {accountsList.length <= 4 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {accountsList.map((acc) => {
                        const isSelected = (selectedAccount?.key || '') === acc.key;
                        return (
                          <button
                            key={acc.key}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleAccountChange(acc.key)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: isSelected ? '1.5px solid var(--color-primary, #4f46e5)' : '1px solid #cbd5e1',
                              background: isSelected ? 'rgba(79, 70, 229, 0.05)' : '#ffffff',
                              cursor: isSubmitting ? 'default' : 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  border: isSelected ? '4px solid var(--color-primary, #4f46e5)' : '1.5px solid #94a3b8',
                                  background: '#ffffff',
                                  flexShrink: 0,
                                }}
                              />
                              <span style={{ fontSize: '0.83rem', fontWeight: isSelected ? 700 : 600, color: '#0f172a' }}>
                                {acc.etiqueta}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? 'var(--color-primary, #4f46e5)' : '#334155' }}>
                              {formatMoney(acc.saldo_disponible)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <select
                      id={`${modalId}-source-account`}
                      value={selectedAccount?.key || ''}
                      onChange={(e) => handleAccountChange(e.target.value)}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: '#0f172a',
                        background: '#ffffff',
                        outline: 'none',
                      }}
                    >
                      {accountsList.map((acc) => (
                        <option key={acc.key} value={acc.key}>
                          {acc.etiqueta} — {formatMoney(acc.saldo_disponible)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Saldo Disponible de la Cuenta y Destino */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    {selectedAccount ? 'Disponible en cuenta' : 'Saldo Disponible'}
                  </span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {formatMoney(maxAvailable)}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '0.76rem',
                    color: '#475569',
                  }}
                >
                  <Building2 size={14} color="#64748b" />
                  <span>
                    Destino: <strong>{bankInfo.banco}</strong> ({bankInfo.cuenta})
                  </span>
                </div>
              </div>

              {/* Monto a Retirar */}
              <div className="hero-amount-field" style={{ margin: '0 0 2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <label
                    htmlFor={`${modalId}-amount`}
                    style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}
                  >
                    Monto a retirar
                  </label>
                </div>
                <div className="hero-amount-box">
                  <span className="hero-amount-currency" aria-hidden="true">$</span>
                  <input
                    autoFocus
                    className="hero-amount-input"
                    id={`${modalId}-amount`}
                    inputMode="decimal"
                    disabled={isSubmitting}
                    max={maxAvailable}
                    min="1"
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={amount}
                  />
                  <span className="hero-amount-suffix" aria-hidden="true">MXN</span>
                </div>

                {/* Atajos de porcentaje */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  {[25, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickPercent(pct)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {pct === 100 ? 'Todo' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* NIP de Seguridad y Enlace de Recuperación */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    htmlFor={`${modalId}-nip`}
                    style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}
                  >
                    NIP de seguridad
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResettingNip(true);
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
                    ¿Olvidaste tu NIP?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id={`${modalId}-nip`}
                    type={showNip ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={nip}
                    onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      borderRadius: '10px',
                      border: '2px solid #e9d5ff',
                      fontSize: '1.25rem',
                      letterSpacing: showNip ? '0.15em' : '0.35em',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: 'var(--purple-950, #1e1b4b)',
                      outline: 'none',
                      background: '#ffffff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNip(!showNip)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                    aria-label={showNip ? 'Ocultar NIP' : 'Mostrar NIP'}
                  >
                    {showNip ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Botón de envío */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <Button
                  type="button"
                  className="button-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{ flex: 1, minHeight: '38px', fontSize: '0.82rem' }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="button-primary"
                  disabled={isSubmitting || Number(amount) <= 0 || nip.length < 4}
                  style={{
                    flex: 1.5,
                    minHeight: '38px',
                    fontSize: '0.82rem',
                    background: '#b91c1c',
                    borderColor: '#991b1b',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="spinner" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <span>Solicitar Retiro</span>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* Vista Compacta de Recuperación de NIP */
            <form onSubmit={handleResetNipSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                <KeyRound size={17} />
                <strong style={{ fontSize: '0.86rem' }}>Configurar Nuevo NIP</strong>
              </div>

              {resetError && <Alert type="danger" message={resetError} />}
              {resetSuccess && <Alert type="success" message={resetSuccess} />}

              {/* Contraseña actual */}
              <div>
                <label
                  htmlFor={`${modalId}-reset-pass`}
                  style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
                >
                  Contraseña actual
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id={`${modalId}-reset-pass`}
                    type={showResetPass ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Contraseña de tu cuenta"
                    disabled={isResetSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 36px 8px 12px',
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
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                  >
                    {showResetPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Nuevo NIP y Confirmación */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label
                    htmlFor={`${modalId}-new-nip`}
                    style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
                  >
                    Nuevo NIP
                  </label>
                  <input
                    id={`${modalId}-new-nip`}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetNewNip}
                    onChange={(e) => setResetNewNip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••"
                    disabled={isResetSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      letterSpacing: '0.2em',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${modalId}-conf-nip`}
                    style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
                  >
                    Confirmar NIP
                  </label>
                  <input
                    id={`${modalId}-conf-nip`}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetConfirmNip}
                    onChange={(e) => setResetConfirmNip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••"
                    disabled={isResetSubmitting}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'monospace',
                      letterSpacing: '0.2em',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <Button
                  type="button"
                  className="button-secondary"
                  onClick={() => setIsResettingNip(false)}
                  disabled={isResetSubmitting}
                  style={{ flex: 1, minHeight: '36px', fontSize: '0.8rem' }}
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  className="button-primary"
                  disabled={isResetSubmitting || !resetPassword || resetNewNip.length < 4}
                  style={{ flex: 1.5, minHeight: '36px', fontSize: '0.8rem' }}
                >
                  {isResetSubmitting ? (
                    <>
                      <Loader2 size={14} className="spinner" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar NIP</span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
