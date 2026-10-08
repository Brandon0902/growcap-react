import { useState, useEffect } from 'react';
import { Check, Clock, Copy, FileText, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import Button from '../../../components/common/Button.jsx';
import Alert from '../../../components/common/Alert.jsx';
import { getClienteAvalToken, generateClienteAvalToken } from '../services/loanService.js';
import { normalizeApiError } from '../../../api/apiUtils.js';
import AvalTermsModal from './AvalTermsModal.jsx';

export default function AvalTokenCard() {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const loadToken = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getClienteAvalToken();
      setTokenData(data);
      if (data) {
        setAcceptedTerms(true);
      }
    } catch (err) {
      console.error('Error fetching aval token:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadToken();
  }, []);

  const handleGenerate = async () => {
    if (!acceptedTerms && !tokenData) {
      setError('Debes marcar la casilla para aceptar los Términos y Cláusulas del Aval Solidario antes de generar tu código.');
      return;
    }

    try {
      setGenerating(true);
      setError('');
      setMessage('');
      const data = await generateClienteAvalToken({ accept_terms: true });
      setTokenData(data);
      setAcceptedTerms(true);
      setMessage('¡Código de aval generado exitosamente con 48 horas de vigencia!');
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible generar el código de aval.');
      setError(normalized.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!tokenData?.token) return;
    navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 14px rgba(17, 24, 39, 0.04)',
        marginBottom: '28px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--color-primary), var(--purple-950))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 10px rgba(107, 33, 168, 0.22)',
            }}
            aria-hidden="true"
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text)' }}>
              Mi Código de Aval Digital
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
              Genera tu código de 48 horas para respaldar a un compañero de trabajo.
            </p>
          </div>
        </div>

        <div>
          {loading ? (
            <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>Consultando...</span>
          ) : tokenData ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--color-primary-soft)',
                  border: '1px solid var(--purple-200)',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  fontFamily: 'monospace',
                  fontSize: '1.15rem',
                  fontWeight: '700',
                  letterSpacing: '1px',
                  color: 'var(--purple-950)',
                }}
              >
                {tokenData.token}
              </div>

              <Button
                onClick={handleCopy}
                className={copied ? 'button-secondary icon-button' : 'icon-button'}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                }}
              >
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>

              <Button
                className="button-secondary icon-button"
                disabled={generating}
                onClick={handleGenerate}
                style={{
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                }}
              >
                <RefreshCw size={15} className={generating ? 'spin' : ''} aria-hidden="true" />
                {generating ? 'Renovando...' : 'Renovar'}
              </Button>
            </div>
          ) : (
            <Button
              className="icon-button"
              disabled={generating}
              onClick={handleGenerate}
              style={{
                padding: '10px 20px',
                fontSize: '0.9rem',
                borderRadius: '10px',
                opacity: !acceptedTerms ? 0.82 : 1,
              }}
            >
              <Sparkles size={18} aria-hidden="true" />
              {generating ? 'Generando...' : 'Generar mi Código de Aval'}
            </Button>
          )}
        </div>
      </div>

      {tokenData && (
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--color-primary-dark)' }}>
          <Clock size={16} style={{ flexShrink: 0, color: 'var(--color-primary)' }} aria-hidden="true" />
          <span>
            Vigente por <strong>{tokenData.hours_remaining} hora(s)</strong> (expira el {tokenData.expires_at}). Cada código es de <strong>uso único</strong> y se desactiva automáticamente tras formalizar una solicitud.
          </span>
        </div>
      )}

      {/* Fila de Aceptación: Checkbox al costado de "Ver cláusulas" */}
      <div className="aval-terms-acceptance-row">
        <label className="aval-terms-inline-checkbox-label">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (error) setError('');
            }}
            disabled={generating}
            className="aval-terms-checkbox"
          />
          <span className="aval-terms-inline-text">
            Acepto los <strong>Términos y Cláusulas del Aval Solidario</strong>
          </span>
        </label>

        <span className="aval-terms-dot-separator" aria-hidden="true">·</span>

        <button
          type="button"
          onClick={() => setShowTermsModal(true)}
          className="aval-terms-link-btn"
        >
          <FileText size={15} aria-hidden="true" />
          Ver cláusulas
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '14px' }}>
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {message && (
        <div style={{ marginTop: '14px' }}>
          <Alert type="success">{message}</Alert>
        </div>
      )}

      <AvalTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setAcceptedTerms(true);
          if (error) setError('');
        }}
        isAccepted={Boolean(tokenData) || acceptedTerms}
      />
    </div>
  );
}
