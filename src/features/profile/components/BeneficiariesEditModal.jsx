import { AlertCircle, CheckCircle2, FileText, Info, Percent, Save, Users, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import { updateBeneficiaries } from '../services/profileService.js';

function BeneficiariesEditModal({
  isOpen,
  onClose,
  currentBeneficiaries = {},
  onSuccess,
  onOpenTerms,
}) {
  const [b1Name, setB1Name] = useState('');
  const [b1Phone, setB1Phone] = useState('');
  const [b1Pct, setB1Pct] = useState('100');

  const [b2Name, setB2Name] = useState('');
  const [b2Phone, setB2Phone] = useState('');
  const [b2Pct, setB2Pct] = useState('0');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const modalRef = useRef(null);

  // Cargar datos actuales cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSuccessMessage('');

    const b1 = currentBeneficiaries?.beneficiario || '';
    const b1Tel = currentBeneficiaries?.beneficiario_telefono || '';
    const b1P = currentBeneficiaries?.porcentaje_1 !== undefined && currentBeneficiaries?.porcentaje_1 !== null
      ? String(currentBeneficiaries.porcentaje_1)
      : '100';

    const b2 = currentBeneficiaries?.beneficiario_02 || '';
    const b2Tel = currentBeneficiaries?.beneficiario_telefono_02 || '';
    const b2P = currentBeneficiaries?.porcentaje_2 !== undefined && currentBeneficiaries?.porcentaje_2 !== null
      ? String(currentBeneficiaries.porcentaje_2)
      : '0';

    setB1Name(b1);
    setB1Phone(b1Tel);
    setB1Pct(b1P);

    setB2Name(b2);
    setB2Phone(b2Tel);
    setB2Pct(b2P);
  }, [isOpen, currentBeneficiaries]);

  // Tecla Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Cálculo reactivo de porcentajes
  const numB1 = parseFloat(b1Pct) || 0;
  const numB2 = parseFloat(b2Pct) || 0;
  const totalPercentage = Math.round((numB1 + numB2) * 100) / 100;
  const isExact100 = totalPercentage === 100;
  const isOver100 = totalPercentage > 100;
  const isUnder100 = totalPercentage < 100;

  const handleQuickDistribute = (mode) => {
    if (mode === 'single') {
      setB1Pct('100');
      setB2Pct('0');
      if (!b2Name) {
        setB2Phone('');
      }
    } else if (mode === 'split') {
      setB1Pct('50');
      setB2Pct('50');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!isExact100) {
      setError(`La suma de los porcentajes debe ser exactamente 100%. Actualmente suma ${totalPercentage}%.`);
      return;
    }

    if (numB1 > 0 && !b1Name.trim()) {
      setError('Por favor indica el nombre completo del primer beneficiario.');
      return;
    }

    if (numB2 > 0 && !b2Name.trim()) {
      setError('Por favor indica el nombre completo del segundo beneficiario.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        beneficiario: b1Name.trim() || null,
        beneficiario_telefono: b1Phone.trim() || null,
        porcentaje_1: numB1,
        beneficiario_02: numB2 > 0 ? (b2Name.trim() || null) : null,
        beneficiario_telefono_02: numB2 > 0 ? (b2Phone.trim() || null) : null,
        porcentaje_2: numB2,
      };

      await updateBeneficiaries(payload);

      setSuccessMessage('Beneficiarios actualizados exitosamente.');
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible actualizar los beneficiarios.');
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="beneficiaries-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="beneficiaries-modal-title"
        aria-modal="true"
        className="beneficiaries-modal-dialog"
        ref={modalRef}
        role="dialog"
      >
        <div className="beneficiaries-modal-header">
          <div className="beneficiaries-modal-header-info">
            <div className="beneficiaries-modal-icon-badge" aria-hidden="true">
              <Users size={20} />
            </div>
            <div>
              <span className="beneficiaries-modal-kicker">Protección Patrimonial</span>
              <h2 id="beneficiaries-modal-title">Editar beneficiarios</h2>
            </div>
          </div>

          <Button
            aria-label="Cerrar modal"
            className="button-secondary beneficiaries-modal-close"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="beneficiaries-modal-form">
          <div className="beneficiaries-modal-body">
            <p className="beneficiaries-modal-intro">
              Designa a las personas que recibirán tus fondos y rendimientos en caso de fallecimiento. Recuerda que la suma de porcentajes debe totalizar exactamente el 100%.
            </p>

            {/* Barra de progreso reactiva */}
            <div className={`beneficiaries-meter-card ${isExact100 ? 'meter-valid' : isOver100 ? 'meter-danger' : 'meter-warning'}`}>
              <div className="meter-header">
                <span className="meter-label">
                  <Percent size={15} />
                  Distribución porcentual acumulada
                </span>
                <span className="meter-value">{totalPercentage}% / 100%</span>
              </div>

              <div className="meter-track">
                <div
                  className="meter-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, totalPercentage))}%`,
                    backgroundColor: isExact100 ? '#10b981' : isOver100 ? '#ef4444' : '#f59e0b',
                  }}
                />
              </div>

              <div className="meter-feedback">
                {isExact100 && (
                  <span className="feedback-text text-success">
                    <CheckCircle2 size={15} /> Distribución completa y válida (100%)
                  </span>
                )}
                {isUnder100 && (
                  <span className="feedback-text text-warning">
                    <AlertCircle size={15} /> Falta asignar {(100 - totalPercentage).toFixed(0)}% para completar el 100%
                  </span>
                )}
                {isOver100 && (
                  <span className="feedback-text text-danger">
                    <AlertCircle size={15} /> Excede el 100% por {(totalPercentage - 100).toFixed(0)}%
                  </span>
                )}

                <div className="quick-distribute-actions">
                  <button
                    type="button"
                    className="quick-btn"
                    onClick={() => handleQuickDistribute('single')}
                  >
                    100% al 1°
                  </button>
                  <button
                    type="button"
                    className="quick-btn"
                    onClick={() => handleQuickDistribute('split')}
                  >
                    50% / 50%
                  </button>
                </div>
              </div>
            </div>

            {error && <Alert type="error">{error}</Alert>}
            {successMessage && (
              <Alert type="success">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} />
                  <span>{successMessage}</span>
                </div>
              </Alert>
            )}

            {/* Beneficiario 1 */}
            <div className="beneficiary-slot-box">
              <div className="slot-badge-row">
                <span className="slot-tag">Beneficiario Principal (1)</span>
                <span className="slot-pct-pill">{numB1}% asignado</span>
              </div>

              <div className="slot-inputs-grid">
                <div className="slot-col-name">
                  <Input
                    disabled={isSubmitting || Boolean(successMessage)}
                    id="b1_name"
                    label="Nombre completo"
                    name="b1_name"
                    onChange={(e) => setB1Name(e.target.value)}
                    placeholder="Ej. María Elena Pérez Gómez"
                    type="text"
                    value={b1Name}
                  />
                </div>

                <div className="slot-col-phone">
                  <Input
                    disabled={isSubmitting || Boolean(successMessage)}
                    id="b1_phone"
                    label="Teléfono de contacto"
                    name="b1_phone"
                    onChange={(e) => setB1Phone(e.target.value)}
                    placeholder="Ej. 5512345678"
                    type="tel"
                    value={b1Phone}
                  />
                </div>

                <div className="slot-col-pct">
                  <Input
                    disabled={isSubmitting || Boolean(successMessage)}
                    id="b1_pct"
                    label="Porcentaje (%)"
                    max="100"
                    min="0"
                    name="b1_pct"
                    onChange={(e) => setB1Pct(e.target.value)}
                    placeholder="100"
                    step="1"
                    type="number"
                    value={b1Pct}
                  />
                </div>
              </div>
            </div>

            {/* Beneficiario 2 */}
            <div className="beneficiary-slot-box">
              <div className="slot-badge-row">
                <span className="slot-tag">Beneficiario Secundario (2)</span>
                <span className="slot-pct-pill">{numB2}% asignado</span>
              </div>

              <div className="slot-inputs-grid">
                <div className="slot-col-name">
                  <Input
                    disabled={isSubmitting || Boolean(successMessage)}
                    id="b2_name"
                    label="Nombre completo (Opcional si es 0%)"
                    name="b2_name"
                    onChange={(e) => setB2Name(e.target.value)}
                    placeholder="Ej. Carlos Alberto Pérez Gómez"
                    type="text"
                    value={b2Name}
                  />
                </div>

                <div className="slot-col-phone">
                  <Input
                    disabled={isSubmitting || Boolean(successMessage)}
                    id="b2_phone"
                    label="Teléfono de contacto"
                    name="b2_phone"
                    onChange={(e) => setB2Phone(e.target.value)}
                    placeholder="Ej. 5587654321"
                    type="tel"
                    value={b2Phone}
                  />
                </div>

                <div className="slot-col-pct">
                  <Input
                    disabled={isSubmitting || Boolean(successMessage)}
                    id="b2_pct"
                    label="Porcentaje (%)"
                    max="100"
                    min="0"
                    name="b2_pct"
                    onChange={(e) => setB2Pct(e.target.value)}
                    placeholder="0"
                    step="1"
                    type="number"
                    value={b2Pct}
                  />
                </div>
              </div>
            </div>

            {/* Enlace de términos y condiciones sobrio */}
            <div className="terms-link-banner">
              <Info size={16} className="terms-link-icon" />
              <div className="terms-link-text">
                Al guardar, ratificas la designación patrimonial conforme al marco normativo vigente.{' '}
                <button
                  type="button"
                  className="terms-inline-trigger"
                  onClick={() => {
                    if (onOpenTerms) onOpenTerms();
                  }}
                >
                  <FileText size={14} />
                  Consultar términos y condiciones legales de beneficiarios
                </button>
              </div>
            </div>
          </div>

          <div className="beneficiaries-modal-footer">
            <Button
              className="button-secondary"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </Button>
            <Button
              className="icon-button button-primary"
              disabled={isSubmitting || !isExact100 || Boolean(successMessage)}
              type="submit"
            >
              <Save size={18} aria-hidden="true" />
              {isSubmitting ? 'Guardando...' : 'Guardar beneficiarios'}
            </Button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
}

export default BeneficiariesEditModal;
