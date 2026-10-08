import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import {
  createLoanMercadoPagoPreference,
  getLoanBankDetails,
  submitLoanAbonoSpei,
} from '../services/loanService.js';

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

export default function LoanAbonoModal({
  isOpen,
  onClose,
  prestamo,
  onSuccess,
}) {
  const modalId = useId();
  const [method, setMethod] = useState('SPEI'); // 'SPEI' | 'MERCADOPAGO'
  const [amount, setAmount] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [bankData, setBankData] = useState(null);
  const [isLoadingBank, setIsLoadingBank] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Default local datetime
  const defaultLocalDatetime = useMemo(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  }, []);
  const [fechaDeposito, setFechaDeposito] = useState(defaultLocalDatetime);

  // Initial amount set to cuota_fija or saldo_restante
  useEffect(() => {
    if (prestamo) {
      const cuota = Number(prestamo.cuota_fija || 0);
      const saldo = Number(prestamo.saldo_restante || 0);
      if (cuota > 0 && cuota <= saldo) {
        setAmount(String(cuota));
      } else if (saldo > 0) {
        setAmount(String(saldo));
      } else {
        setAmount('500');
      }
    }
  }, [prestamo]);

  const numAmount = useMemo(() => {
    const clean = String(amount).replace(/[^0-9.]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }, [amount]);

  const saldoRestante = useMemo(() => {
    return Number(prestamo?.saldo_restante ?? 0);
  }, [prestamo]);

  const cuotaFija = useMemo(() => {
    return Number(prestamo?.cuota_fija ?? 0);
  }, [prestamo]);

  const frecuencia = useMemo(() => {
    return prestamo?.frecuencia_pago || 'Semanal';
  }, [prestamo]);

  // Gross-up Mercado Pago Fee Calculation (3.49% + $4.00 + 16% IVA)
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
    const pid = prestamo?.id ?? 'LN';
    return `LN-${pid}-${Date.now().toString().slice(-4)}`;
  }, [prestamo?.id]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingBank(true);
    getLoanBankDetails()
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
      })
      .finally(() => {
        if (isMounted) setIsLoadingBank(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (numAmount < 10) {
      setError('El monto mínimo para realizar un abono es de $10.00 MXN.');
      return;
    }
    if (numAmount > saldoRestante + 5) {
      setError(`El monto a abonar (${formatMoney(numAmount)}) supera el saldo restante del préstamo (${formatMoney(saldoRestante)}).`);
      return;
    }

    // Mercado Pago Flow: Redirect to official Checkout Pro
    if (method === 'MERCADOPAGO') {
      try {
        setIsSubmitting(true);
        setError('');
        const res = await createLoanMercadoPagoPreference(prestamo.id, numAmount);
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

    // SPEI / Bank Transfer Flow
    try {
      setIsSubmitting(true);
      setError('');

      const formData = new FormData();
      formData.append('monto', String(numAmount));
      formData.append('metodo_pago', 'SPEI');
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

      const res = await submitLoanAbonoSpei(prestamo.id, formData);
      if (onSuccess) {
        onSuccess(res?.message || `Abono de ${formatMoney(numAmount)} enviado para validación.`);
      }
      onClose();
    } catch (err) {
      setError(normalizeApiError(err) || 'Error al registrar el abono al préstamo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nuevoSaldoProyectado = Math.max(0, saldoRestante - numAmount);
  const esLiquidacionTotal = numAmount >= saldoRestante && saldoRestante > 0;

  return createPortal(
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
          maxWidth: '495px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
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
                borderRadius: '8px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #a7f3d0',
              }}
            >
              <CreditCard size={19} />
            </div>
            <div>
              <h2
                id={`${modalId}-title`}
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '-0.01em',
                }}
              >
                Abonar / Liquidar Préstamo
              </h2>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Préstamo #{prestamo?.id} • Saldo restante:{' '}
                <strong style={{ color: '#dc2626' }}>{formatMoney(saldoRestante)}</strong>
              </span>
            </div>
          </div>

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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <Alert type="error">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} />
                  <span style={{ fontSize: '0.8rem' }}>{error}</span>
                </div>
              </Alert>
            )}

            {/* Quick Amount Selection & Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                  Monto del abono:
                </label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {cuotaFija > 0 && cuotaFija <= saldoRestante && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(cuotaFija))}
                      style={{
                        background: numAmount === cuotaFija ? '#ecfdf5' : '#f8fafc',
                        border: numAmount === cuotaFija ? '1px solid #86efac' : '1px solid #e2e8f0',
                        color: numAmount === cuotaFija ? '#15803d' : '#475569',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      1 Cuota ({formatMoney(cuotaFija)})
                    </button>
                  )}
                  {cuotaFija > 0 && cuotaFija * 2 < saldoRestante && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(cuotaFija * 2))}
                      style={{
                        background: numAmount === cuotaFija * 2 ? '#ecfdf5' : '#f8fafc',
                        border: numAmount === cuotaFija * 2 ? '1px solid #86efac' : '1px solid #e2e8f0',
                        color: numAmount === cuotaFija * 2 ? '#15803d' : '#475569',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      2 Cuotas ({formatMoney(cuotaFija * 2)})
                    </button>
                  )}
                  {saldoRestante > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(saldoRestante))}
                      style={{
                        background: numAmount === saldoRestante ? '#ecfdf5' : '#f8fafc',
                        border: numAmount === saldoRestante ? '1px solid #86efac' : '1px solid #e2e8f0',
                        color: numAmount === saldoRestante ? '#15803d' : '#475569',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Liquidar Total ({formatMoney(saldoRestante)})
                    </button>
                  )}
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
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 28px',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {numAmount > 0 && (
                <div
                  style={{
                    fontSize: '0.74rem',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    background: esLiquidacionTotal ? '#ecfdf5' : '#f8fafc',
                    borderRadius: '6px',
                    border: esLiquidacionTotal ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ color: esLiquidacionTotal ? '#047857' : '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {esLiquidacionTotal ? <CheckCircle2 size={13} color="#059669" /> : <TrendingDown size={13} />}
                    <strong>{esLiquidacionTotal ? '¡Con este abono liquidas el préstamo por completo!' : 'Nuevo saldo restante proyectado:'}</strong>
                  </span>
                  <strong style={{ color: esLiquidacionTotal ? '#059669' : '#0f172a', fontSize: '0.85rem' }}>
                    {formatMoney(nuevoSaldoProyectado)}
                  </strong>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
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
                  padding: '7px 12px',
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
                <Building2 size={14} />
                <span>SPEI (Transferencia)</span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    background: '#f1f5f9',
                    color: '#059669',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  0% com.
                </span>
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
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: method === 'MERCADOPAGO' ? '#ffffff' : 'transparent',
                  color: method === 'MERCADOPAGO' ? '#009EE3' : '#64748b',
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
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    background: method === 'MERCADOPAGO' ? '#e0f2fe' : '#e2e8f0',
                    color: method === 'MERCADOPAGO' ? '#009EE3' : '#64748b',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  Inmediato 24/7
                </span>
              </button>
            </div>

            {/* TAB 1: SPEI / Bank Transfer Details */}
            {method === 'SPEI' && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Datos Bancarios GROWCAP
                  </span>
                  <span style={{ fontSize: '0.66rem', color: '#15803d', fontWeight: 600, background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px' }}>
                    Sin comisión bancaria
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '6px', fontSize: '0.74rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.67rem', display: 'block' }}>Banco:</span>
                    <strong style={{ color: '#1e293b' }}>{bankData?.banco || 'BBVA México'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.67rem', display: 'block' }}>Beneficiario:</span>
                    <strong style={{ color: '#1e293b' }}>{bankData?.beneficiario || 'GROWCAP S.A. DE C.V.'}</strong>
                  </div>
                </div>

                {/* CLABE with copy */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.64rem', color: '#64748b', display: 'block' }}>CLABE Interbancaria (18 dígitos):</span>
                    <strong style={{ fontFamily: 'monospace', fontSize: '0.88rem', letterSpacing: '0.04em', color: '#0f172a' }}>
                      {bankData?.clabe || '012180015040590130'}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankData?.clabe || '012180015040590130', 'clabe')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: copiedField === 'clabe' ? '#ecfdf5' : '#ffffff',
                      color: copiedField === 'clabe' ? '#15803d' : '#475569',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedField === 'clabe' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'clabe' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>

                {/* Concept / Reference with copy */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.64rem', color: '#64748b', display: 'block' }}>Concepto / Referencia sugerida:</span>
                    <strong style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#0f172a' }}>
                      {referenciaSugerida}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(referenciaSugerida, 'ref')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: copiedField === 'ref' ? '#ecfdf5' : '#ffffff',
                      color: copiedField === 'ref' ? '#15803d' : '#475569',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedField === 'ref' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'ref' ? 'Copiado' : 'Copiar'}
                  </button>
                </div>

                {/* Comprobante File Upload */}
                <div style={{ marginTop: '4px' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Comprobante de transferencia SPEI:
                  </label>
                  <label
                    style={{
                      border: '1.5px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: comprobanteFile ? '#f0fdf4' : '#ffffff',
                      borderColor: comprobanteFile ? '#86efac' : '#cbd5e1',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                    {comprobanteFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d' }}>
                        <FileCheck size={18} />
                        <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>{comprobanteFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setComprobanteFile(null);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={18} color="#64748b" style={{ marginBottom: '4px' }} />
                        <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500 }}>
                          Subir comprobante bancario (PDF, PNG o JPG)
                        </span>
                        <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>Máx. 10MB</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Additional optional fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                      Fecha/hora transferencia:
                    </label>
                    <input
                      type="datetime-local"
                      value={fechaDeposito}
                      onChange={(e) => setFechaDeposito(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '0.74rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                      Notas adicionales (opcional):
                    </label>
                    <input
                      type="text"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Folio o banco emisor"
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '0.74rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Mercado Pago Checkout Pro Details */}
            {method === 'MERCADOPAGO' && (
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                      src={mpLogo}
                      alt="Mercado Pago"
                      style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 600 }}>
                      • Checkout Pro Seguro
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      color: '#0369a1',
                      fontWeight: 700,
                      background: '#e0f2fe',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    Acreditación Inmediata 24/7
                  </span>
                </div>

                {/* Accepted Payment Methods */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    color: '#475569',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Medios aceptados:</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontWeight: 600, fontSize: '0.67rem' }}>
                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#1e293b' }}>
                      💳 Débito / Crédito
                    </span>
                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#0284c7' }}>
                      💙 Saldo MP
                    </span>
                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#15803d' }}>
                      🏪 Efectivo
                    </span>
                  </div>
                </div>

                {/* Transparent Accounting Breakdown */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.74rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Abono directo al saldo de tu deuda:</span>
                    <strong style={{ color: '#0f172a' }}>{formatMoney(numAmount)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Costo pasarela Mercado Pago (3.49% + $4 + IVA):</span>
                    <span>{formatMoney(mpCalculation.comision)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0284c7',
                    }}
                  >
                    <span>Total a pagar en pasarela:</span>
                    <span>{formatMoney(mpCalculation.total)}</span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '0.72rem',
                    color: '#166534',
                  }}
                >
                  <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#15803d' }} />
                  <span>
                    <strong>Acreditación instantánea garantizada:</strong> Al completar tu pago, la pasarela nos notificará de inmediato y tu saldo restante se descontará en el sistema de manera 100% autónoma.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer / Actions */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f8fafc',
            }}
          >
            <Button type="button" className="button-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            {method === 'SPEI' ? (
              <Button
                type="submit"
                className="button-primary icon-button"
                disabled={isSubmitting || numAmount <= 0}
                style={{
                  minHeight: '38px',
                  padding: '8px 18px',
                  fontWeight: 600,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Registrar Comprobante SPEI
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || numAmount <= 0}
                style={{
                  background: '#009EE3',
                  color: '#ffffff',
                  border: 'none',
                  minHeight: '38px',
                  padding: '8px 18px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0, 158, 227, 0.3)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Conectando con Mercado Pago...
                  </>
                ) : (
                  <>
                    <img
                      src={mpIcon}
                      alt="MP"
                      style={{ width: '16px', height: '16px', borderRadius: '3px' }}
                    />
                    Pagar {formatMoney(mpCalculation.total)} con Mercado Pago
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
