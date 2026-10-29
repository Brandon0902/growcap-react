import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck,
  FileText,
  History,
  PlusCircle,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import useAuth from '../../auth/hooks/useAuth.js';
import {
  createDeposito,
  deleteDeposito,
  getBankDetails,
  getDepositos,
} from '../services/depositService.js';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const clean = String(dateStr).trim().replace(' ', 'T');
  const d = new Date(clean.length === 10 ? `${clean}T00:00:00` : clean);
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadge(status) {
  const s = Number(status ?? 0);
  if (s === 1) {
    return {
      label: 'Acreditado',
      bg: '#ecfdf5',
      color: '#15803d',
      border: '#bbf7d0',
    };
  }
  if (s === 2 || s === 4) {
    return {
      label: 'Rechazado',
      bg: '#fef2f2',
      color: '#991b1b',
      border: '#fecaca',
    };
  }
  return {
    label: 'En Revisión',
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
  };
}

export default function DepositModal({ isOpen, onClose, onSuccess }) {
  const modalId = useId();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [bankData, setBankData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Form states
  const [amount, setAmount] = useState('');
  const [fechaDeposito, setFechaDeposito] = useState(() => new Date().toISOString().slice(0, 10));
  const [referencia, setReferencia] = useState('');
  const [nota, setNota] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState(null);

  // UI & Request states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // History states
  const [depositsList, setDepositsList] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const suggestedConcept = useMemo(() => {
    const uid = user?.id || 'CLI';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `DEP-${uid}-${rand}`;
  }, [user?.id]);

  const loadDeposits = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const res = await getDepositos();
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setDepositsList(list);
    } catch {
      setDepositsList([]);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    getBankDetails().then((res) => {
      if (res?.data) setBankData(res.data);
    });
    loadDeposits();
  }, [isOpen, loadDeposits]);

  const resetForm = useCallback(() => {
    setAmount('');
    setFechaDeposito(new Date().toISOString().slice(0, 10));
    setReferencia('');
    setNota('');
    setComprobanteFile(null);
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    resetForm();
    setSuccessMessage('');
    onClose();
  }, [isSubmitting, onClose, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, handleClose]);

  if (!isOpen) return null;

  const handleCopy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError('El comprobante no debe superar los 15 MB.');
        return;
      }
      setComprobanteFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Ingresa un monto válido mayor a $0.');
      return;
    }

    if (!comprobanteFile) {
      setError('El comprobante de pago es obligatorio.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('cantidad', String(numAmount));
      formData.append('fecha_deposito', fechaDeposito);
      formData.append('referencia', referencia.trim() || suggestedConcept);
      if (nota.trim()) {
        formData.append('nota', nota.trim());
      }
      formData.append('comprobante', comprobanteFile);

      await createDeposito(formData);

      setSuccessMessage(`Depósito de ${formatMoney(numAmount)} registrado correctamente.`);
      resetForm();
      await loadDeposits();
      onSuccess?.();
      setTimeout(() => {
        setActiveTab('history');
      }, 900);
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible registrar el depósito.');
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Deseas cancelar esta solicitud de depósito pendiente?')) return;
    setDeletingId(id);
    try {
      await deleteDeposito(id);
      await loadDeposits();
      onSuccess?.();
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible cancelar el depósito.');
      setError(normalized.message);
    } finally {
      setDeletingId(null);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 18px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #bfdbfe',
                flexShrink: 0,
              }}
            >
              <Building2 size={16} />
            </div>
            <div>
              <h2
                id={`${modalId}-title`}
                style={{
                  margin: 0,
                  fontSize: '0.96rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  lineHeight: 1.2,
                }}
              >
                Cargar Saldo
              </h2>
              <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
                Abona a tu saldo disponible vía SPEI
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
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

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '4px 16px 0',
            gap: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderBottom: activeTab === 'new' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'new' ? '#1e293b' : '#64748b',
              fontWeight: activeTab === 'new' ? 700 : 500,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <PlusCircle size={13} />
            <span>Registrar Depósito</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'history' ? '#1e293b' : '#64748b',
              fontWeight: activeTab === 'history' ? 700 : 500,
              fontSize: '0.76rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <History size={13} />
            <span>Mis Depósitos ({depositsList.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ marginBottom: '10px' }}>
              <Alert type="error">{error}</Alert>
            </div>
          )}

          {successMessage && (
            <div style={{ marginBottom: '10px' }}>
              <Alert type="success">{successMessage}</Alert>
            </div>
          )}

          {activeTab === 'new' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Voucher SPEI Compacto */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.67rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
                    CLABE Interbancaria
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(bankData?.clabe || '012180015040590130', 'clabe')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: copiedField === 'clabe' ? '#ecfdf5' : '#ffffff',
                      color: copiedField === 'clabe' ? '#15803d' : '#475569',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedField === 'clabe' ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedField === 'clabe' ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>

                <div style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                  {bankData?.clabe || '012180015040590130'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                  <span>Banco: <strong style={{ color: '#334155' }}>{bankData?.banco || 'BBVA / STP'}</strong></span>
                  <span>Beneficiario: <strong style={{ color: '#334155' }}>{bankData?.beneficiario || 'GROWCAP'}</strong></span>
                </div>
              </div>

              {/* Input Monto Hero Compacto */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  Monto transferido *
                </label>
                <div className="hero-amount-field" style={{ margin: 0, gap: 0 }}>
                  <div className="hero-amount-box" style={{ padding: '4px 12px', borderRadius: '10px' }}>
                    <span className="hero-amount-currency" style={{ fontSize: '1.4rem' }}>$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="1"
                      placeholder="0.00"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="hero-amount-input"
                      style={{ fontSize: '1.45rem', padding: '2px 0' }}
                    />
                    <span className="hero-amount-suffix" style={{ fontSize: '0.75rem' }}>MXN</span>
                  </div>
                </div>
              </div>

              {/* Fila Fecha y Referencia en 2 Columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaDeposito}
                    onChange={(e) => setFechaDeposito(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '7px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    Folio / Rastreo SPEI *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={suggestedConcept}
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '7px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Upload Comprobante Compacto */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Comprobante de pago *
                </label>
                <div
                  style={{
                    border: comprobanteFile ? '1.5px solid #22c55e' : '1.5px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    background: comprobanteFile ? '#f0fdf4' : '#fafafa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '40px',
                    boxSizing: 'border-box',
                  }}
                  onClick={() => document.getElementById(`${modalId}-file-input`)?.click()}
                >
                  <input
                    id={`${modalId}-file-input`}
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  {comprobanteFile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                      <FileCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                      <strong style={{ fontSize: '0.75rem', color: '#15803d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {comprobanteFile.name}
                      </strong>
                      <span style={{ fontSize: '0.68rem', color: '#16a34a', flexShrink: 0 }}>
                        ({(comprobanteFile.size / 1024).toFixed(0)} KB) • Cambiar
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Upload size={15} color="#64748b" />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>
                        Adjuntar comprobante
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        (PDF, JPG o PNG)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Nota opcional */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Nota adicional (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Transferencia desde cuenta personal BBVA"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '0.80rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '7px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Acciones */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '4px',
                  paddingTop: '10px',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <Button
                  type="button"
                  className="button-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  style={{ fontSize: '0.78rem', padding: '6px 14px', minHeight: '32px' }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="button-primary"
                  disabled={isSubmitting || !comprobanteFile || !amount}
                  style={{ fontSize: '0.78rem', padding: '6px 16px', minHeight: '32px' }}
                >
                  {isSubmitting ? 'Registrando...' : 'Registrar Depósito'}
                </Button>
              </div>
            </form>
          ) : (
            /* Tab: Historial de Depósitos */
            <div>
              {isLoadingList ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b', fontSize: '0.82rem' }}>
                  Cargando depósitos...
                </div>
              ) : depositsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                  <Building2 size={32} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    No tienes depósitos registrados
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Tus solicitudes de abono a saldo disponible aparecerán aquí.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {depositsList.map((dep) => {
                    const badge = getStatusBadge(dep.status);
                    const isPending = Number(dep.status) === 0;

                    return (
                      <div
                        key={dep.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                              {formatMoney(dep.cantidad)}
                            </strong>
                            <span
                              style={{
                                fontSize: '0.67rem',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '4px',
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            <span>{formatDate(dep.fecha_deposito)}</span>
                            {dep.referencia && <span> • Ref: {dep.referencia}</span>}
                          </div>
                          {dep.nota && (
                            <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: '#475569', fontStyle: 'italic' }}>
                              {dep.nota}
                            </p>
                          )}
                        </div>

                        {isPending && (
                          <button
                            type="button"
                            disabled={deletingId === dep.id}
                            onClick={() => handleDelete(dep.id)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #fecaca',
                              color: '#b91c1c',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Cancelar solicitud de depósito"
                          >
                            <Trash2 size={12} />
                            <span>{deletingId === dep.id ? 'Cancelando...' : 'Cancelar'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
