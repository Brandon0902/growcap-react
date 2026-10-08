import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  FileCheck,
  Info,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import {
  createMercadoPagoPreference,
  getBankDetails,
  getDepositLimit,
  submitVoluntaryDeposit,
} from '../services/savingsService.js';
import SavingsDepositPoliciesModal from './SavingsDepositPoliciesModal.jsx';
import mpIcon from '../../../assets/mercadopago-icon.png';
import mpLogo from '../../../assets/mercadopago-logo.png';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

export default function SavingsVoluntaryDepositModal({
  isOpen,
  onClose,
  ahorro,
  onSuccess,
}) {
  const modalId = useId();
  const [method, setMethod] = useState('SPEI'); // 'SPEI' | 'MERCADOPAGO'
  const [amount, setAmount] = useState('1000');
  const [observaciones, setObservaciones] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [bankData, setBankData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Política y límites de depósito voluntario
  const [policy, setPolicy] = useState(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);

  // Modal secundario de políticas e información detallada
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [policiesTab, setPoliciesTab] = useState('LIMITS');

  // Fecha y hora local predeterminada
  const defaultLocalDatetime = useMemo(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  }, []);
  const [fechaDeposito, setFechaDeposito] = useState(defaultLocalDatetime);

  const numAmount = useMemo(() => {
    const clean = String(amount).replace(/[^0-9.]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }, [amount]);

  const rendimientoRate = useMemo(() => {
    return Number(ahorro?.rendimiento ?? ahorro?.plan?.rendimiento ?? 10);
  }, [ahorro]);

  const projectedGain = useMemo(() => {
    if (numAmount <= 0) return 0;
    return numAmount * (rendimientoRate / 100);
  }, [numAmount, rendimientoRate]);

  // Cálculo matemático de comisión de Mercado Pago (Gross-up)
  const mpCalculation = useMemo(() => {
    if (numAmount <= 0) return { comision: 0, total: 0 };
    const IVA = 0.16;
    const PERCENTAGE_RATE = 0.0349 * (1 + IVA); // 0.040484
    const FIXED_FEE = 4.00 * (1 + IVA); // 4.64 MXN
    const total = Number(((numAmount + FIXED_FEE) / (1 - PERCENTAGE_RATE)).toFixed(2));
    const comision = Number((total - numAmount).toFixed(2));
    return { comision, total };
  }, [numAmount]);

  const referenciaSugerida = useMemo(() => {
    const aid = ahorro?.id ?? 'AHO';
    return `VOL-${aid}-${Date.now().toString().slice(-4)}`;
  }, [ahorro?.id]);

  const isLiquidationWindow = useMemo(() => {
    return Boolean(policy?.is_blocked && policy?.block_reason === 'LIQUIDATION_WINDOW');
  }, [policy]);

  const disponibleMes = useMemo(() => {
    return policy ? Number(policy.disponible_mes ?? 0) : null;
  }, [policy]);

  const isMonthlyLimitReached = useMemo(() => {
    return Boolean(disponibleMes !== null && disponibleMes <= 0);
  }, [disponibleMes]);

  const isAmountExceeded = useMemo(() => {
    return Boolean(disponibleMes !== null && numAmount > disponibleMes);
  }, [disponibleMes, numAmount]);

  // Carga de política de límites
  useEffect(() => {
    if (!isOpen || !ahorro?.id) return;
    let isMounted = true;
    setIsLoadingPolicy(true);
    getDepositLimit(ahorro.id)
      .then((res) => {
        if (isMounted && res?.data) {
          setPolicy(res.data);
          const disp = Number(res.data.disponible_mes ?? 0);
          if (disp > 0 && disp < 1000) {
            setAmount(String(disp));
          }
        }
      })
      .catch((err) => {
        console.error('Error al cargar política de depósitos:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPolicy(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, ahorro?.id]);

  // Carga de datos bancarios de GrowCap
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    getBankDetails()
      .then((res) => {
        if (isMounted && res?.data) setBankData(res.data);
      })
      .catch(() => {
        if (isMounted) {
          setBankData({
            banco: 'BBVA México',
            beneficiario: 'GROWCAP S.A. DE C.V.',
            clabe: '012180015040590130',
            cuenta: '1504059013',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 1800);
  };

  const handleOpenPolicies = (tab = 'LIMITS') => {
    setPoliciesTab(tab);
    setShowPoliciesModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numAmount < 50) {
      setError('El monto mínimo para una aportación voluntaria es de $50.00 MXN.');
      return;
    }

    if (isLiquidationWindow) {
      setError('Este plan se encuentra a menos de 15 días de su liquidación. No se admiten aportaciones voluntarias.');
      return;
    }

    if (isMonthlyLimitReached) {
      setError(`Has alcanzado el límite mensual de aportaciones voluntarias (${formatMoney(policy?.limite_mensual)}) para este plan.`);
      return;
    }

    if (isAmountExceeded) {
      setError(`El monto ingresado excede tu cupo disponible este mes (${formatMoney(disponibleMes)}).`);
      return;
    }

    // Flujo Mercado Pago: Redirección al Checkout Pro oficial
    if (method === 'MERCADOPAGO') {
      try {
        setIsSubmitting(true);
        setError('');
        const res = await createMercadoPagoPreference(ahorro.id, numAmount);
        if (res?.init_point) {
          window.location.href = res.init_point;
          return;
        } else {
          setError('No se pudo generar la sesión de pago con Mercado Pago.');
        }
      } catch (err) {
        setError(normalizeApiError(err) || 'Error al conectar con la pasarela de Mercado Pago.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Flujo SPEI / Transferencia manual
    try {
      setIsSubmitting(true);
      setError('');

      const formData = new FormData();
      formData.append('monto', String(numAmount));
      formData.append('metodo_pago', method);
      formData.append('referencia', referenciaSugerida);
      if (fechaDeposito) {
        formData.append('fecha_deposito', fechaDeposito);
      }
      if (observaciones.trim()) {
        formData.append('observaciones', observaciones.trim());
      }
      if (comprobanteFile) {
        formData.append('comprobante', comprobanteFile);
      }

      const res = await submitVoluntaryDeposit(ahorro.id, formData);
      if (onSuccess) {
        onSuccess(res?.message || `Aportación de ${formatMoney(numAmount)} registrada con éxito.`);
      }
      onClose();
    } catch (err) {
      setError(normalizeApiError(err) || 'Error al procesar la aportación voluntaria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const planNombre = ahorro?.plan?.nombre || ahorro?.tipo_ahorro || `Ahorro #${ahorro?.id}`;

  return (
    <>
      {createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
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
              maxWidth: '470px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Minimalista */}
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
                    background: '#f0fdf4',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h2
                    id={`${modalId}-title`}
                    style={{
                      margin: 0,
                      fontSize: '1.02rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Aportación Voluntaria
                  </h2>
                  <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                    {planNombre} • {rendimientoRate}% anual
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {policy && (
                  <button
                    type="button"
                    onClick={() => handleOpenPolicies('LIMITS')}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#475569',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Ver condiciones y límites del plan"
                  >
                    <Info size={12} />
                    <span>Políticas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
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
            </div>

            {/* Caso 1: Ventana de liquidación (<15 días) */}
            {isLiquidationWindow ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div
                  style={{
                    padding: '36px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <ShieldCheck size={24} />
                  </div>

                  <div style={{ maxWidth: '360px' }}>
                    <h3
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '0.98rem',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      Aportaciones extraordinarias concluidas
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.81rem',
                        color: '#475569',
                        lineHeight: '1.5',
                      }}
                    >
                      Este plan concluye el{' '}
                      <strong>
                        {policy?.fecha_fin
                          ? new Date(String(policy.fecha_fin).replace(' ', 'T')).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'próximamente'}
                      </strong>{' '}
                      {policy?.dias_restantes !== null && `(restan ${policy.dias_restantes} días)`}. Para garantizar
                      la conciliación de rendimientos y preparar la entrega de tus fondos, ya no es posible recibir depósitos extraordinarios.
                    </p>
                    <p
                      style={{
                        marginTop: '10px',
                        fontSize: '0.74rem',
                        color: '#64748b',
                      }}
                    >
                      Tus aportaciones periódicas por descuento de nómina continuarán normalmente.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPolicies('LIMITS')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Info size={13} />
                    <span>Conoce las políticas de liquidación</span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '12px 20px',
                    borderTop: '1px solid #f1f5f9',
                    background: '#f8fafc',
                  }}
                >
                  <Button
                    type="button"
                    className="button-secondary"
                    onClick={onClose}
                    style={{ fontSize: '0.78rem', padding: '6px 18px' }}
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            ) : (
              /* Caso 2: Formulario de depósito ultra limpio */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {error && (
                    <div
                      style={{
                        padding: '8px 12px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#991b1b',
                        fontSize: '0.76rem',
                      }}
                    >
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Tira compacta de cupo mensual disponible */}
                  {policy && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '0.73rem',
                      }}
                    >
                      <span style={{ color: '#475569' }}>
                         Este mes puedes aportar hasta:{' '}
                        <strong style={{ color: isMonthlyLimitReached ? '#64748b' : '#0f172a' }}>
                          {formatMoney(disponibleMes)}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenPolicies('LIMITS')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <span>Ver políticas</span>
                        <Info size={11} />
                      </button>
                    </div>
                  )}

                  {/* Campo de Monto */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155' }}>
                        Monto a ingresar:
                      </label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[500, 1000, 2500].map((val) => {
                          const isOver = disponibleMes !== null && val > disponibleMes;
                          return (
                            <button
                              key={val}
                              type="button"
                              disabled={isOver || isMonthlyLimitReached}
                              onClick={() => setAmount(String(val))}
                              style={{
                                background: numAmount === val ? '#ecfdf5' : '#f8fafc',
                                border: numAmount === val ? '1px solid #86efac' : '1px solid #e2e8f0',
                                color: isOver ? '#94a3b8' : (numAmount === val ? '#15803d' : '#475569'),
                                fontSize: '0.67rem',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                cursor: (isOver || isMonthlyLimitReached) ? 'not-allowed' : 'pointer',
                                opacity: (isOver || isMonthlyLimitReached) ? 0.5 : 1,
                              }}
                            >
                              +${val.toLocaleString('es-MX')}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: '#94a3b8',
                        }}
                      >
                        $
                      </span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder="0.00"
                        required
                        disabled={isMonthlyLimitReached}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 28px',
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          border: isAmountExceeded ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                          borderRadius: '8px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          backgroundColor: isMonthlyLimitReached ? '#f8fafc' : '#ffffff',
                        }}
                      />
                    </div>

                    {isAmountExceeded && (
                      <div style={{ fontSize: '0.71rem', color: '#b91c1c', marginTop: '4px' }}>
                        Supera tu cupo disponible de este mes ({formatMoney(disponibleMes)}).
                      </div>
                    )}

                    {numAmount > 0 && !isAmountExceeded && (
                      <div style={{ fontSize: '0.71rem', color: '#15803d', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={12} />
                        <span>
                          Rendimiento estimado: <strong>+{formatMoney(projectedGain)}/año</strong> ({rendimientoRate}%).
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Selector de Método de Pago Compacto */}
                  <div
                    style={{
                      display: 'flex',
                      background: '#f1f5f9',
                      padding: '3px',
                      borderRadius: '8px',
                      gap: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setMethod('SPEI')}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: method === 'SPEI' ? '#ffffff' : 'transparent',
                        color: method === 'SPEI' ? '#0f172a' : '#64748b',
                        fontWeight: method === 'SPEI' ? 700 : 500,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        boxShadow: method === 'SPEI' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Building2 size={13} />
                      <span>SPEI (Sin comisión)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('MERCADOPAGO')}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: method === 'MERCADOPAGO' ? '#ffffff' : 'transparent',
                        color: method === 'MERCADOPAGO' ? '#0284c7' : '#64748b',
                        fontWeight: method === 'MERCADOPAGO' ? 700 : 500,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        boxShadow: method === 'MERCADOPAGO' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img
                        src={mpIcon}
                        alt="Mercado Pago"
                        style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'contain' }}
                      />
                      <span>Mercado Pago</span>
                    </button>
                  </div>

                  {/* Panel SPEI Minimalista */}
                  {method === 'SPEI' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Voucher bancario compacto */}
                      <div
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.71rem' }}>
                          <span style={{ color: '#64748b' }}>Banco: <strong>{bankData?.banco || 'BBVA México'}</strong></span>
                          <span style={{ color: '#64748b' }}>Beneficiario: <strong>{bankData?.beneficiario || 'GROWCAP'}</strong></span>
                        </div>

                        <div
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <span style={{ display: 'block', fontSize: '0.61rem', color: '#64748b', textTransform: 'uppercase' }}>
                              CLABE
                            </span>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.04em', fontFamily: 'monospace' }}>
                              {bankData?.clabe || '012180015040590130'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(bankData?.clabe || '012180015040590130', 'clabe')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '3px 7px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: copiedField === 'clabe' ? '#ecfdf5' : '#ffffff',
                              color: copiedField === 'clabe' ? '#15803d' : '#475569',
                              fontSize: '0.67rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {copiedField === 'clabe' ? <Check size={11} /> : <Copy size={11} />}
                            {copiedField === 'clabe' ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>

                        <div
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <span style={{ display: 'block', fontSize: '0.61rem', color: '#64748b', textTransform: 'uppercase' }}>
                              Concepto / Referencia
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                              {referenciaSugerida}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(referenciaSugerida, 'ref')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '3px 7px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              background: copiedField === 'ref' ? '#ecfdf5' : '#ffffff',
                              color: copiedField === 'ref' ? '#15803d' : '#475569',
                              fontSize: '0.67rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {copiedField === 'ref' ? <Check size={11} /> : <Copy size={11} />}
                            {copiedField === 'ref' ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      {/* Adjuntar comprobante */}
                      <div>
                        {comprobanteFile ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: '#ecfdf5',
                              border: '1px solid #86efac',
                              borderRadius: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <FileCheck size={15} color="#15803d" />
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#166534', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {comprobanteFile.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setComprobanteFile(null)}
                              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '8px',
                              border: '1px dashed #cbd5e1',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: '#f8fafc',
                              fontSize: '0.72rem',
                              color: '#475569',
                              fontWeight: 500,
                            }}
                          >
                            <Upload size={14} color="#64748b" />
                            <span>Adjuntar comprobante de pago</span>
                            <input
                              type="file"
                              accept="application/pdf,image/png,image/jpeg,image/jpg"
                              onChange={(e) => {
                                if (e.target.files?.[0]) setComprobanteFile(e.target.files[0]);
                              }}
                              style={{ display: 'none' }}
                            />
                          </label>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#64748b' }}>
                        <span>Acreditación: máx. 24 horas hábiles.</span>
                        <button
                          type="button"
                          onClick={() => handleOpenPolicies('CHANNELS')}
                          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: '0.68rem' }}
                        >
                          Más información
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Panel Mercado Pago Minimalista */}
                  {method === 'MERCADOPAGO' && (
                    <div
                      style={{
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <img src={mpLogo} alt="Mercado Pago" style={{ height: '18px', width: 'auto' }} />
                        <span style={{ fontSize: '0.66rem', color: '#0369a1', fontWeight: 700, background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                          Acreditación Inmediata 24/7
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.73rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Aportación neta:</span>
                          <strong style={{ color: '#0f172a' }}>{formatMoney(numAmount)} MXN</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>Tarifa pasarela (3.49% + $4 + IVA):</span>
                          <span style={{ color: '#d97706', fontWeight: 600 }}>+{formatMoney(mpCalculation.comision)} MXN</span>
                        </div>
                        <div
                          style={{
                            borderTop: '1px dashed #bae6fd',
                            paddingTop: '6px',
                            marginTop: '2px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>Total a pagar:</span>
                          <strong style={{ color: '#0284c7', fontSize: '0.98rem' }}>{formatMoney(mpCalculation.total)} MXN</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.67rem', color: '#0284c7' }}>
                        <span>Acepta tarjetas, saldo MP y efectivo.</span>
                        <button
                          type="button"
                          onClick={() => handleOpenPolicies('CHANNELS')}
                          style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                        >
                          Detalles de tarifa
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Minimalista */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderTop: '1px solid #f1f5f9',
                    background: '#f8fafc',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenPolicies('LIMITS')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.72rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <Info size={13} />
                    <span>Reglas y límites</span>
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      type="button"
                      className="button-secondary"
                      onClick={onClose}
                      disabled={isSubmitting}
                      style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="button-primary"
                      disabled={isSubmitting || numAmount < 50 || isAmountExceeded || isMonthlyLimitReached}
                      style={{
                        fontSize: '0.78rem',
                        padding: '6px 18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        background: method === 'MERCADOPAGO' ? '#009EE3' : 'var(--color-primary)',
                        borderColor: method === 'MERCADOPAGO' ? '#0084ca' : 'transparent',
                        opacity: (isAmountExceeded || isMonthlyLimitReached) ? 0.6 : 1,
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="spin" />
                          <span>Procesando...</span>
                        </>
                      ) : method === 'MERCADOPAGO' ? (
                        <>
                          <img
                            src={mpIcon}
                            alt=""
                            style={{ width: '16px', height: '16px', borderRadius: '3px', objectFit: 'contain' }}
                          />
                          <span>Pagar con MP ({formatMoney(mpCalculation.total)})</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Aportar {formatMoney(numAmount)}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal Secundario: Políticas y Condiciones detalladas */}
      <SavingsDepositPoliciesModal
        isOpen={showPoliciesModal}
        onClose={() => setShowPoliciesModal(false)}
        policy={policy}
        ahorro={ahorro}
        defaultTab={policiesTab}
      />
    </>
  );
}
