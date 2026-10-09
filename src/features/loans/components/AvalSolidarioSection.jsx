import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
  if (!name) return 'SO';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const AvalSolidarioSection = forwardRef(function AvalSolidarioSection(
  { requests = [], onReview, onReload },
  ref
) {
  const rootRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(requests.length > 0);
  const [activeTab, setActiveTab] = useState(requests.length > 0 ? 'solicitudes' : 'codigo');

  // Exponer API imperativa para auto-expandir al hacer scroll desde el banner
  useImperativeHandle(ref, () => ({
    expand: () => setIsExpanded(true),
    scrollIntoView: (options) => {
      setIsExpanded(true);
      setTimeout(() => {
        rootRef.current?.scrollIntoView(options ?? { behavior: 'smooth', block: 'start' });
      }, 50);
    },
    get current() {
      return rootRef.current;
    },
  }));

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
    fetchToken();
  }, []);

  // Si llegan nuevas solicitudes, auto-expandir y alternar a solicitudes
  useEffect(() => {
    if (requests.length > 0) {
      setIsExpanded(true);
      if (activeTab !== 'solicitudes') {
        setActiveTab('solicitudes');
      }
    }
  }, [requests.length]);

  const handleGenerateToken = async () => {
    if (!acceptedTerms && !tokenData) {
      setShowTermsModal(true);
      return;
    }

    try {
      setGeneratingToken(true);
      setTokenError('');
      setTokenMessage('');
      const data = await generateClienteAvalToken({ accept_terms: true });
      setTokenData(data);
      setAcceptedTerms(true);
      setTokenMessage('Código de aval generado exitosamente (vigencia de 48 horas).');
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

  return (
    <section
      ref={rootRef}
      id="seccion-aval-solidario"
      className="section-block aval-solidario-section motion-immediate"
      style={{
        marginTop: '36px',
        scrollMarginTop: '24px',
      }}
    >
      {/* Barra Cabecera Desplegable / Accordion */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        style={{
          background: 'var(--color-surface, #ffffff)',
          border: '1px solid #e2e8f0',
          borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
          transition: 'all 0.2s ease',
        }}
        aria-expanded={isExpanded}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: requests.length > 0 ? '#fef2f2' : '#f0fdf4',
              color: requests.length > 0 ? '#dc2626' : '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${requests.length > 0 ? '#fecaca' : '#bbf7d0'}`,
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                Aval Solidario
              </h2>
              {requests.length > 0 ? (
                <span
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                  }}
                >
                  {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} pendiente{requests.length !== 1 ? 's' : ''}
                </span>
              ) : (
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#64748b',
                    fontSize: '0.70rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '8px',
                  }}
                >
                  Opcional
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>
              Autoriza solicitudes de respaldo o genera tu código digital para apoyar a compañeros.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '0.80rem', fontWeight: 600, color: '#2563eb' }}>
            {isExpanded ? 'Contraer' : 'Desplegar'}
          </span>
          <div
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {/* Contenedor Interior Expandible */}
      {isExpanded && (
        <div
          style={{
            background: 'var(--color-surface, #ffffff)',
            border: '1px solid #e2e8f0',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Barra de pestañas sobria */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              padding: '4px 20px 0',
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
              fontSize: '0.86rem',
              padding: '10px 14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-1px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Solicitudes de Aval</span>
            {requests.length > 0 && (
              <span
                style={{
                  background: activeTab === 'solicitudes' ? '#2563eb' : '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  padding: '1px 7px',
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
              fontSize: '0.86rem',
              padding: '10px 14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '-1px',
              transition: 'all 0.15s ease',
            }}
          >
            <KeyRound size={15} />
            <span>Mi Código de Aval</span>
          </button>
        </div>

        {/* Contenido de la pestaña */}
        <div style={{ padding: 'clamp(16px, 2vw, 24px)' }}>
          {/* TAB 1: SOLICITUDES DE AVAL */}
          {activeTab === 'solicitudes' && (
            <div>
              {requests.length === 0 ? (
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: '#f0fdf4',
                      color: '#15803d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <ShieldCheck size={22} />
                  </div>
                  <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>
                    Sin solicitudes de aval pendientes
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', lineHeight: '1.45' }}>
                    Cuando un compañero ingrese tu código digital, la solicitud se listará aquí para tu revisión y autorización.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: '#64748b' }}>
                    Tienes {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} pendiente{requests.length !== 1 ? 's' : ''} de autorización:
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
                          borderRadius: '10px',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 280px' }}>
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
                              fontSize: '0.88rem',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(nombre)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                                {nombre}
                              </strong>
                              {numEmp && (
                                <span
                                  style={{
                                    fontSize: '0.70rem',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '0.80rem', color: '#475569' }}>
                              <span>Monto: <strong style={{ color: '#0f172a' }}>{formatMoney(monto)} MXN</strong></span>
                              <span>•</span>
                              <span>Cuota: <strong style={{ color: '#15803d' }}>{formatMoney(cuota)} ({rec})</strong></span>
                            </div>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                              Solicitud #{req.id} • Registrada: {formatDate(req.fecha_solicitud || req.fecha)}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          className="button-primary"
                          onClick={() => onReview && onReview(req)}
                          style={{
                            fontSize: '0.82rem',
                            padding: '8px 16px',
                            minHeight: '36px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#0f172a',
                            borderColor: '#0f172a',
                          }}
                        >
                          <span>Revisar y responder</span>
                          <ChevronRight size={15} />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MI CÓDIGO DE AVAL */}
          {activeTab === 'codigo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '640px' }}>
              {tokenError && <Alert type="error">{tokenError}</Alert>}
              {tokenMessage && <Alert type="success">{tokenMessage}</Alert>}

              <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: '1.45' }}>
                Comparte este código digital único con el compañero que desees respaldar. Vigencia: 48 horas tras su generación.
              </p>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 20px',
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
                          padding: '8px 18px',
                          fontFamily: 'monospace',
                          fontSize: '1.3rem',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.80rem', color: '#334155' }}>
                      <Clock size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                      <span>
                        Vigente por <strong>{tokenData.hours_remaining} hora(s)</strong> (expira: {tokenData.expires_at}).
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                      Código de uso único. Se consumirá automáticamente cuando el solicitante complete el trámite.
                    </span>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Actualmente no tienes un código de aval activo. Genera uno nuevo para compartirlo con tu compañero.
                    </p>

                    <Button
                      type="button"
                      className="button-primary"
                      disabled={generatingToken}
                      onClick={handleGenerateToken}
                      style={{
                        padding: '8px 18px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        background: '#0f172a',
                        borderColor: '#0f172a',
                      }}
                    >
                      {generatingToken ? 'Generando código...' : 'Generar código de aval'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {showTermsModal && (
        <AvalTermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          onAccept={async () => {
            setAcceptedTerms(true);
            setShowTermsModal(false);
            try {
              setGeneratingToken(true);
              setTokenError('');
              const data = await generateClienteAvalToken({ accept_terms: true });
              setTokenData(data);
              setTokenMessage('Código de aval generado exitosamente.');
            } catch (err) {
              const normalized = normalizeApiError(err, 'No fue posible generar el código de aval.');
              setTokenError(normalized.message);
            } finally {
              setGeneratingToken(false);
            }
          }}
        />
      )}
    </section>
  );
});

export default AvalSolidarioSection;
