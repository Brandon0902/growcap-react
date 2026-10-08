import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import Input from '../../../components/common/Input.jsx';
import { changeClientPassword } from '../services/profileService.js';

function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const modalRef = useRef(null);

  const resetForm = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError('');
    setSuccessMessage('');
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  }, [isSubmitting, onClose, resetForm]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen, isSubmitting, resetForm]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!currentPassword) {
      setError('Por favor ingresa tu contraseña actual.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await changeClientPassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setSuccessMessage(response.message || 'Contraseña actualizada correctamente.');
      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (err) {
      const normalized = normalizeApiError(err, 'No fue posible actualizar la contraseña.');
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="password-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <section
        aria-labelledby="change-password-modal-title"
        aria-modal="true"
        className="password-modal-dialog"
        ref={modalRef}
        role="dialog"
      >
        <div className="password-modal-header">
          <div className="password-modal-header-info">
            <div className="password-modal-icon-badge" aria-hidden="true">
              <KeyRound size={20} />
            </div>
            <div>
              <span className="password-modal-kicker">Seguridad de la cuenta</span>
              <h2 id="change-password-modal-title">Cambiar contraseña</h2>
            </div>
          </div>

          <Button
            aria-label="Cerrar modal"
            className="button-secondary password-modal-close"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="password-modal-form">
          <div className="password-modal-body">
            <p className="password-modal-intro">
              Por seguridad, ingresa tu contraseña vigente antes de definir tu nueva clave de acceso.
            </p>

            {error && <Alert type="error">{error}</Alert>}
            {successMessage && (
              <Alert type="success">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} />
                  <span>{successMessage}</span>
                </div>
              </Alert>
            )}

            <Input
              autoComplete="current-password"
              disabled={isSubmitting || Boolean(successMessage)}
              id="current_password"
              label="Contraseña actual"
              name="current_password"
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingresa tu contraseña vigente"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              action={
                <button
                  aria-label={showCurrent ? 'Ocultar contraseña' : 'Ver contraseña'}
                  onClick={() => setShowCurrent((prev) => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    padding: 0,
                  }}
                  type="button"
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <Input
              autoComplete="new-password"
              disabled={isSubmitting || Boolean(successMessage)}
              id="new_password"
              label="Nueva contraseña (mínimo 8 caracteres)"
              name="new_password"
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Define tu nueva clave"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              action={
                <button
                  aria-label={showNew ? 'Ocultar contraseña' : 'Ver contraseña'}
                  onClick={() => setShowNew((prev) => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    padding: 0,
                  }}
                  type="button"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <Input
              autoComplete="new-password"
              disabled={isSubmitting || Boolean(successMessage)}
              id="confirm_password"
              label="Confirmar nueva contraseña"
              name="confirm_password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu nueva clave"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              action={
                <button
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                  onClick={() => setShowConfirm((prev) => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    padding: 0,
                  }}
                  type="button"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
          </div>

          <div className="password-modal-footer">
            <Button
              className="button-secondary"
              disabled={isSubmitting}
              onClick={handleClose}
              type="button"
            >
              Cancelar
            </Button>
            <Button
              className="icon-button"
              disabled={isSubmitting || Boolean(successMessage)}
              type="submit"
            >
              <Lock size={18} aria-hidden="true" />
              {isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
}

export default ChangePasswordModal;
