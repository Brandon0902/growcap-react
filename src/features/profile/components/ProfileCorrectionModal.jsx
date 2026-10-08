import { Building2, CheckCircle2, FileEdit, HelpCircle, Send, ShieldAlert, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import { submitProfileCorrection } from '../services/profileService.js';

const CORRECTION_FIELDS = [
  { key: 'apellido', label: 'Apellidos (Paterno / Materno)', profileKey: 'apellido' },
  { key: 'nombre', label: 'Nombre(s)', profileKey: 'nombre' },
  { key: 'rfc', label: 'RFC (Registro Federal de Contribuyentes)', profileKey: 'rfc' },
  { key: 'telefono', label: 'Teléfono de contacto / Celular', profileKey: 'telefono' },
  { key: 'email', label: 'Correo electrónico', profileKey: 'email' },
  { key: 'direccion', label: 'Domicilio / Dirección residencial', profileKey: 'direccion' },
  { key: 'colonia', label: 'Colonia', profileKey: 'colonia' },
  { key: 'cp', label: 'Código Postal', profileKey: 'cp' },
  { key: 'banco', label: 'Institución Bancaria', profileKey: 'banco' },
  { key: 'cuenta', label: 'Número de cuenta / CLABE', profileKey: 'cuenta' },
  { key: 'otro', label: 'Otro dato / Aclaración general', profileKey: null },
];

function ProfileCorrectionModal({
  isOpen,
  onClose,
  initialField = 'apellido',
  currentProfileData = {},
  isInstitutional = false,
  empresaNombre = '',
  numeroEmpleado = '',
}) {

  const [selectedField, setSelectedField] = useState(initialField || 'apellido');
  const [valorPropuesto, setValorPropuesto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const modalRef = useRef(null);

  // Determinar el valor actual dinámicamente según el campo elegido
  const currentFieldValue = useMemo(() => {
    const config = CORRECTION_FIELDS.find((f) => f.key === selectedField);
    if (!config || !config.profileKey) return '';
    return currentProfileData?.[config.profileKey] || '';
  }, [selectedField, currentProfileData]);

  // Sincronizar campo inicial cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;
    setSelectedField(initialField || 'apellido');
    setValorPropuesto('');
    setMotivo('');
    setError('');
    setSuccessInfo(null);
  }, [isOpen, initialField]);

  // Manejo de ESC
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessInfo(null);

    if (!valorPropuesto.trim()) {
      setError('Por favor indica el nuevo valor propuesto o corregido.');
      return;
    }

    if (!motivo.trim()) {
      setError('Por favor detalla el motivo o justificación de la corrección.');
      return;
    }

    const fieldConfig = CORRECTION_FIELDS.find((f) => f.key === selectedField);
    const campoLabel = fieldConfig ? fieldConfig.label : selectedField;

    setIsSubmitting(true);

    try {
      const response = await submitProfileCorrection({
        campo: selectedField,
        campo_label: campoLabel,
        valor_actual: String(currentFieldValue || '').trim() || null,
        valor_propuesto: valorPropuesto.trim(),
        motivo: motivo.trim(),
      });

      setSuccessInfo(response);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible registrar tu solicitud de corrección.');
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="correction-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="correction-modal-title"
        aria-modal="true"
        className="correction-modal-dialog"
        ref={modalRef}
        role="dialog"
      >
        <div className="correction-modal-header">
          <div className="correction-modal-header-info">
            <div className="correction-modal-icon-badge" aria-hidden="true">
              <FileEdit size={20} />
            </div>
            <div>
              <span className="correction-modal-kicker">Mesa de Control y Soporte</span>
              <h2 id="correction-modal-title">Solicitar corrección de datos</h2>
            </div>
          </div>

          <Button
            aria-label="Cerrar modal"
            className="button-secondary correction-modal-close"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="correction-modal-form">
          <div className="correction-modal-body">
            {isInstitutional ? (
              <div className="correction-info-banner banner-institutional">
                <Building2 size={20} className="banner-icon" />
                <div>
                  <strong style={{ color: '#4338ca', display: 'block', fontSize: '0.88rem', marginBottom: '2px' }}>
                    Convenio Institucional · {empresaNombre || 'Empresa Empleadora'}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: '1.45' }}>
                    Tus datos oficiales y de nómina (Nombre, RFC{numeroEmpleado ? `, No. Empleado #${numeroEmpleado}` : ''}) están vinculados al sistema de Recursos Humanos (HRMS) de tu empresa. Al enviar esta solicitud, notificaremos al equipo administrativo de GrowCap y al enlace de RRHH para gestionar la validación sin afectar tus deducciones de nómina.
                  </p>
                </div>
              </div>
            ) : (
              <div className="correction-info-banner banner-direct">
                <ShieldAlert size={20} className="banner-icon" />
                <div>
                  <strong style={{ color: '#4338ca', display: 'block', fontSize: '0.88rem', marginBottom: '2px' }}>
                    Socio Directo GrowCap
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: '1.45' }}>
                    Tu solicitud será atendida y validada por el equipo administrativo de GrowCap. Se te notificará y contactará para cotejar tu documentación soporte oficial (INE / Cédula SAT) antes de la actualización en tu expediente digital.
                  </p>
                </div>
              </div>
            )}

            {error && <Alert type="error">{error}</Alert>}

            {successInfo && (
              <Alert type="success">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <CheckCircle2 size={18} />
                    <span>{successInfo.message || 'Solicitud registrada correctamente.'}</span>
                  </div>
                  {successInfo.ticket?.id && (
                    <small style={{ opacity: 0.9 }}>
                      Folio de ticket de seguimiento: #{successInfo.ticket.id}
                    </small>
                  )}
                </div>
              </Alert>
            )}

            {/* Selector del dato a corregir */}
            <div className="form-field">
              <label className="form-label" htmlFor="field-select">
                Dato o campo a corregir
              </label>
              <select
                className="input select-input"
                disabled={isSubmitting || Boolean(successInfo)}
                id="field-select"
                onChange={(e) => setSelectedField(e.target.value)}
                value={selectedField}
              >
                {CORRECTION_FIELDS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Valor actual registrado */}
            <div className="current-value-preview">
              <span className="preview-label">Valor actual en sistema:</span>
              <span className="preview-content">
                {currentFieldValue ? String(currentFieldValue) : 'Sin registro previo o valor no capturado'}
              </span>
            </div>

            {/* Nuevo valor propuesto */}
            <Input
              disabled={isSubmitting || Boolean(successInfo)}
              id="valor_propuesto"
              label="Nuevo valor propuesto o corregido"
              name="valor_propuesto"
              onChange={(e) => setValorPropuesto(e.target.value)}
              placeholder="Ingresa el dato exacto y verificado"
              type="text"
              value={valorPropuesto}
            />

            {/* Motivo o justificación */}
            <div className="form-field">
              <label className="form-label" htmlFor="motivo">
                Motivo o justificación de la corrección
              </label>
              <textarea
                className="input textarea-input"
                disabled={isSubmitting || Boolean(successInfo)}
                id="motivo"
                name="motivo"
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explica brevemente la razón del cambio (ej. error ortográfico en acta de nacimiento, actualización de constancia de situación fiscal, etc.)"
                rows={3}
                value={motivo}
              />
            </div>
          </div>

          <div className="correction-modal-footer">
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
              disabled={isSubmitting || Boolean(successInfo)}
              type="submit"
            >
              <Send size={18} aria-hidden="true" />
              {isSubmitting ? 'Enviando solicitud...' : isInstitutional ? 'Enviar a RRHH y GrowCap' : 'Enviar solicitud'}
            </Button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
}

export default ProfileCorrectionModal;
