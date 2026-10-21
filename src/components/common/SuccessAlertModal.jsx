import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

function SuccessAlertModal({
  isOpen,
  onClose,
  title = 'Retiro solicitado',
  message = 'Su solicitud se realizó con éxito y se verá reflejada en su cuenta en un máximo de 48 hrs.',
  buttonText = 'Aceptar',
  autoCloseMs = 10000,
}) {
  useEffect(() => {
    if (!isOpen) return;

    // Auto dismiss after autoCloseMs
    const timer = setTimeout(() => {
      onClose?.();
    }, autoCloseMs);

    // Escape key listener
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, autoCloseMs]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-alert-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 99999,
        animation: 'growcapFadeIn 0.2s ease-out forwards',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <style>{`
        @keyframes growcapFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes growcapCardScale {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 30px -8px rgba(15, 23, 42, 0.22), 0 10px 15px -3px rgba(15, 23, 42, 0.1)',
          padding: '36px 30px 28px',
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'growcapCardScale 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Circular Checkmark Badge matching reference image */}
        <div
          style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '3.5px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22c55e',
            marginBottom: '20px',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.12)',
            flexShrink: 0,
          }}
        >
          <Check size={38} strokeWidth={3} />
        </div>

        {/* Title */}
        <h3
          id="success-alert-title"
          style={{
            margin: '0 0 10px 0',
            fontSize: '1.28rem',
            fontWeight: 700,
            color: '#1e293b',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h3>

        {/* Message / Description */}
        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '0.88rem',
            color: '#64748b',
            lineHeight: 1.5,
            maxWidth: '310px',
          }}
        >
          {message}
        </p>

        {/* Action Button styled with GrowCap primary palette */}
        <button
          type="button"
          onClick={() => onClose?.()}
          style={{
            width: '100%',
            padding: '11px 20px',
            background: 'var(--color-primary, #6B21A8)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.92rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease, transform 0.1s ease',
            boxShadow: '0 4px 12px rgba(107, 33, 168, 0.25)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-primary-hover, #7E22CE)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-primary, #6B21A8)';
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default SuccessAlertModal;
