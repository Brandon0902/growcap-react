import { X } from 'lucide-react';
import Button from './Button.jsx';

function GuidedRequestModal({
  children,
  error,
  footer,
  isOpen,
  onClose,
  stepIndex,
  title,
  totalSteps,
}) {
  if (!isOpen) {
    return null;
  }

  const progress = Math.max(0, Math.min(100, ((stepIndex + 1) / totalSteps) * 100));

  return (
    <div className="guided-modal-backdrop" role="presentation">
      <section
        aria-labelledby="guided-modal-title"
        aria-modal="true"
        className="guided-modal"
        role="dialog"
      >
        <div className="guided-modal-header">
          <div>
            <span>Paso {stepIndex + 1} de {totalSteps}</span>
            <h2 id="guided-modal-title">{title}</h2>
          </div>
          <Button
            aria-label="Cerrar solicitud"
            className="button-secondary guided-modal-close"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        <div className="guided-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="guided-modal-body">
          {children}
          {error && <p className="guided-error" role="alert">{error}</p>}
        </div>
        <div className="guided-modal-footer">
          {footer}
        </div>
      </section>
    </div>
  );
}

export default GuidedRequestModal;
