import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import useIdleTimer from '../hooks/useIdleTimer.js';
import Button from '../../../components/common/Button.jsx';

function formatCountdown(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function IdleTimeoutModal() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleTimeout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { state: { reason: 'inactivity' }, replace: true });
    }
  };

  const { isWarningOpen, remainingSeconds, resetTimer } = useIdleTimer({
    onTimeout: handleTimeout,
  });

  const handleManualLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  if (!isWarningOpen) {
    return null;
  }

  return createPortal(
    <div className="idle-modal-backdrop" role="presentation">
      <section
        aria-labelledby="idle-modal-title"
        aria-modal="true"
        className="idle-modal-dialog"
        role="dialog"
      >
        <div className="idle-modal-header">
          <div className="idle-modal-icon-badge" aria-hidden="true">
            <Clock size={20} />
          </div>
          <div>
            <span className="idle-modal-kicker">Aviso de seguridad</span>
            <h2 id="idle-modal-title">Sesión por expirar</h2>
          </div>
        </div>

        <div className="idle-modal-body">
          <p className="idle-modal-text">
            Por inactividad, tu sesión se cerrará automáticamente en:
          </p>

          <div className="idle-modal-timer-badge">
            <span className="idle-modal-timer-time">{formatCountdown(remainingSeconds)}</span>
            <span className="idle-modal-timer-label">segundos restantes</span>
          </div>
        </div>

        <div className="idle-modal-footer">
          <Button
            className="button-secondary"
            onClick={handleManualLogout}
            type="button"
          >
            Cerrar sesión
          </Button>

          <Button
            className="button-primary"
            onClick={resetTimer}
            type="button"
            autoFocus
          >
            Mantener sesión activa
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default IdleTimeoutModal;
