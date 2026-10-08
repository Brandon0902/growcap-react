import {
  Check,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import { normalizeApiError } from '../../../api/apiUtils.js';
import {
  generateClienteAvalToken,
  getClienteAvalToken,
} from '../services/loanService.js';
import AvalTermsModal from './AvalTermsModal.jsx';

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
  if (!name) return 'CO';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AvalCenterModal({
  isOpen,
  onClose,
  requests = [],
  onReview,
  initialTab,
}) {
  const modalId = useId();
  const [activeTab, setActiveTab] = useState('solicitudes');

  // Estados de "Mi Código de Aval"
  const [tokenData, setTokenData] = useState(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [tokenMessage, setTokenMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const fetchToken = async () => {
    try {
      setLoadingToken(true);
      setTokenError('');
      const data = await getClienteAvalToken();
      setTokenData(data);
      if (data) {
        setAcceptedTerms(true);
      }
    } catch (err) {
      console.error('Error fetching aval token:', err);
    } finally {
      setLoadingToken(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialTab) {
      setActiveTab(initialTab);
    } else {
      setActiveTab(requests.length > 0 ? 'solicitudes' : 'codigo');
    }

    setTokenError('');
    setTokenMessage('');
    fetchToken();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, initialTab, requests.length, onClose]);

  if (!isOpen) return null;

  const handleGenerateToken = async () => {
    if (!acceptedTerms && !tokenData) {
      setTokenError(
        'Debes aceptar los Términos y Cláusulas del Aval Solidario antes de generar tu código.'
      );
      return;
    }

    try {
      setGeneratingToken(true);
      setTokenError('');
      setTokenMessage('');
      const data = await generateClienteAvalToken({ accept_terms: true });
      setTokenData(data);
      setAcceptedTerms(true);
      setTokenMessage('¡Código de aval generado exitosamente con 48 horas de vigencia!');
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible generar el código de aval.');
      setTokenError(normalized.message);
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyToken = () => {
    if (!tokenData?.token) return;
    navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return createPortal(
    <div
      className="records-modal-backdrop"
      style={{
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="records-modal"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 35px -5px rgba(0, 0, 0, 0.12), 0 10px 15px -5px rgba(0, 0, 0, 0.04)',
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
        {/* Encabezado del Centro de Aval */}
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
                background: '#f8fafc',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} />
            </div>

            <div>
              <h3
                id={`${modalId}-title`}
                style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 600 }}
              >
                Centro de Aval Solidario
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '1px' }}>
                Solicitudes y código de respaldo solidario
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
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas de navegación interna (Tabs) */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '4px 24px 0',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('solicitudes')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'solicitudes' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'solicitudes' ? '#1e40af' : '#64748b',
              fontWeight: activeTab === 'solicitudes' ? 600 : 500,
              fontSize: '0.84rem',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-1px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Solicitudes de Respaldo</span>
            {requests.length > 0 && (
              <span
                style={{
                  background: activeTab === 'solicitudes' ? '#2563eb' : '#cbd5e1',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {requests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('codigo')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'codigo' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'codigo' ? '#1e40af' : '#64748b',
              fontWeight: activeTab === 'codigo' ? 600 : 500,
              fontSize: '0.84rem',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '-1px',
              transition: 'all 0.15s ease',
            }}
          >
            <KeyRound size={14} />
            <span>Mi Código de Aval Digital</span>
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* TAB 1: SOLICITUDES PENDIENTES */}
          {activeTab === 'solicitudes' && (
            <>
              {requests.length === 0 ? (
                <div
                  style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: '#f0fdf4',
                      color: '#15803d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <ShieldCheck size={24} />
                  </div>
                  <strong style={{ fontSize: '0.96rem', color: '#0f172a' }}>
                    Estás al día
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', maxWidth: '340px', lineHeight: '1.45' }}>
                    No tienes solicitudes de respaldo pendientes.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '0.8rem', color: '#64748b' }}>
                    Solicitudes pendientes de confirmación:
                  </p>

                  {requests.map((req) => {
                    const nombre = req.solicitante_nombre || 'Compañero de trabajo';
                    const numEmp = req.solicitante_num_empleado;
                    const monto = Number(req.cantidad ?? req.monto_solicitado ?? 0);
                    const cuota = Number(req.cuota_fija ?? 0);
                    const rec = req.recurrencia_pago || 'Semanal';

                    return (
                      <div
                        key={req.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 280px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: '#e2e8f0',
                              color: '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(nombre)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                                {nombre}
                              </strong>
                              {numEmp && (
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #e2e8f0',
                                  }}
                                >
                                  #{numEmp}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '0.78rem', color: '#475569' }}>
                              <span>Monto: <strong style={{ color: '#0f172a' }}>{formatMoney(monto)} MXN</strong></span>
                              <span>•</span>
                              <span>Cuota: <strong style={{ color: '#15803d' }}>{formatMoney(cuota)} ({rec})</strong></span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
                              Solicitud #{req.id} • {formatDate(req.fecha_solicitud || req.fecha)}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="button-primary"
                          onClick={() => onReview(req)}
                          style={{
                            fontSize: '0.8rem',
                            padding: '7px 14px',
                            minHeight: '34px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#1e293b',
                            borderColor: '#0f172a',
                          }}
                        >
                          <span>Revisar y responder</span>
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: MI CÓDIGO DE AVAL DIGITAL */}
          {activeTab === 'codigo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {tokenError && <Alert type="error">{tokenError}</Alert>}
              {tokenMessage && <Alert type="success">{tokenMessage}</Alert>}

              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.45' }}>
                Comparte este código con quien solicite tu respaldo. Vigencia: 48 horas.
              </p>

              {/* Caja del Código Activo o Botón de Generación */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {loadingToken ? (
                  <span style={{ fontSize: '0.84rem', color: '#64748b' }}>Consultando código activo...</span>
                ) : tokenData ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontFamily: 'monospace',
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          letterSpacing: '2px',
                          color: '#0f172a',
                        }}
                      >
                        {tokenData.token}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button
                          type="button"
                          className={copied ? 'button-secondary icon-button' : 'icon-button'}
                          onClick={handleCopyToken}
                          style={{
                            padding: '7px 14px',
                            fontSize: '0.82rem',
                            borderRadius: '8px',
                          }}
                        >
                          {copied ? <Check size={15} /> : <Copy size={15} />}
                          <span>{copied ? 'Copiado' : 'Copiar'}</span>
                        </Button>

                        <Button
                          type="button"
                          className="button-secondary icon-button"
                          disabled={generatingToken}
                          onClick={handleGenerateToken}
                          style={{
                            padding: '7px 12px',
                            fontSize: '0.82rem',
                            borderRadius: '8px',
                          }}
                          title="Generar un nuevo código (invalida el anterior)"
                        >
                          <RefreshCw size={14} className={generatingToken ? 'spin' : ''} />
                          <span>{generatingToken ? 'Renovando...' : 'Renovar'}</span>
                        </Button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155' }}>
                      <Clock size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                      <span>
                        Vigente por <strong>{tokenData.hours_remaining} hora(s)</strong> (expira el {tokenData.expires_at}).
                      </span>
                    </div>

                    <span style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: '1.4' }}>
                      Código de uso único. Se desactiva al utilizarse o declinarse.
                    </span>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      No tienes un código activo. Genera uno para compartirlo:
                    </p>

                    <Button
                      type="button"
                      className="button-primary"
                      disabled={generatingToken}
                      onClick={handleGenerateToken}
                      style={{
                        alignSelf: 'flex-start',
                        padding: '8px 18px',
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#2563eb',
                        borderColor: '#1d4ed8',
                      }}
                    >
                      <Sparkles size={16} />
                      <span>{generatingToken ? 'Generando código...' : 'Generar mi Código de Aval'}</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Fila de Aceptación de Cláusulas */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.78rem',
                  color: '#475569',
                  flexWrap: 'wrap',
                }}
              >
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      if (tokenError) setTokenError('');
                    }}
                    disabled={generatingToken}
                  />
                  <span>Acepto los <strong>Términos y Cláusulas del Aval Solidario</strong></span>
                </label>

                <span>·</span>

                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <FileText size={14} />
                  Ver cláusulas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            background: '#fafafa',
          }}
        >
          <Button
            type="button"
            className="button-secondary"
            onClick={onClose}
            style={{ fontSize: '0.82rem', padding: '7px 16px', minHeight: '34px' }}
          >
            Cerrar
          </Button>
        </div>
      </div>

      <AvalTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setAcceptedTerms(true);
          if (tokenError) setTokenError('');
        }}
        isAccepted={Boolean(tokenData) || acceptedTerms}
      />
    </div>,
    document.body
  );
}
