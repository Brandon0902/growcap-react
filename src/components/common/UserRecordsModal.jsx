import { X } from 'lucide-react';
import Button from './Button.jsx';

function UserRecordsModal({ children, isOpen, onClose, subtitle, title }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="records-modal-backdrop" role="presentation">
      <section
        aria-labelledby="records-modal-title"
        aria-modal="true"
        className="records-modal"
        role="dialog"
      >
        <header className="records-modal-header">
          <div>
            <span>Registros del cliente</span>
            <h2 id="records-modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <Button
            aria-label="Cerrar registros"
            className="button-secondary records-modal-close"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </header>
        <div className="records-modal-body">
          {children}
        </div>
      </section>
    </div>
  );
}

export default UserRecordsModal;
