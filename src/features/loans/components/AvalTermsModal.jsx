import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Clock,
  Coins,
  FileCheck,
  Lock,
  Scale,
  ShieldAlert,
  X,
} from 'lucide-react';
import Button from '../../../components/common/Button.jsx';

export default function AvalTermsModal({
  isOpen,
  onClose,
  onAccept,
  isAccepted = false,
}) {
  const modalRef = useRef(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    handleClose();
  };

  const clauses = [
    {
      icon: Scale,
      title: '1. Obligación Solidaria e Indivisible',
      desc: 'Te constituyes formalmente como deudor solidario del acreditado frente a la Caja de Ahorro GrowCap. En caso de atraso, mora o impago del deudor principal, adquieres la responsabilidad legal y financiera de cubrir el 100% del saldo insoluto, intereses ordinarios y moratorios devengados.',
    },
    {
      icon: Coins,
      title: '2. Facultad de Cobro y Deducción de Percepciones',
      desc: 'En caso de mora o incumplimiento prolongado imputable al titular del crédito, autorizas y facultas a la administración de GrowCap para aplicar retenciones directas sobre percepciones laborales (nómina), haberes o finiquitos, así como debitar o pignorar saldos de ahorro en garantía en custodia conforme a los estatutos.',
    },
    {
      icon: Lock,
      title: '3. Exclusividad de Respaldo (1 Préstamo a la Vez)',
      desc: 'Reconoces que solo puedes respaldar 1 solo préstamo activo a la vez. Tu calidad de aval permanece activa e inalterable hasta que el crédito respaldado quede totalmente liquidado. Mientras tanto, no podrás avalar a otro compañero ni comprometer tu garantía en nuevos préstamos.',
    },
    {
      icon: Clock,
      title: '4. Código Digital de Uso Único y 48 Horas',
      desc: 'El código dinámico AVL-XXXXXX es personal, intransferible y de un solo uso, con una vigencia máxima improrrogable de 48 horas. Proporcionarlo al solicitante manifiesta tu pleno consentimiento para ser incorporado en el pagaré dual y expediente crediticio correspondiente.',
    },
    {
      icon: FileCheck,
      title: '5. Carácter Vinculante e Irrevocable',
      desc: 'Una vez que la solicitud de crédito ha sido validada, autorizada por el comité y dispersada al acreditado, tu responsabilidad como aval solidario es irrevocable y subsistirá íntegra hasta el finiquito total del préstamo.',
    },
  ];

  return createPortal(
    <div
      className="aval-terms-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <section
        aria-labelledby="aval-terms-modal-title"
        aria-modal="true"
        className="aval-terms-modal-dialog"
        ref={modalRef}
        role="dialog"
      >
        <div className="aval-terms-modal-header">
          <div className="aval-terms-modal-header-info">
            <div className="aval-terms-modal-icon-badge" aria-hidden="true">
              <ShieldAlert size={22} />
            </div>
            <div>
              <span className="aval-terms-modal-kicker">Caja de Ahorro GrowCap · Compromiso Crediticio</span>
              <h2 id="aval-terms-modal-title">Términos y Cláusulas del Aval Solidario</h2>
            </div>
          </div>

          <Button
            aria-label="Cerrar modal"
            className="button-secondary aval-terms-modal-close"
            onClick={handleClose}
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </div>

        <div className="aval-terms-modal-body">
          <div className="aval-terms-intro-banner">
            <p>
              Respaldar a un compañero de trabajo es un acto de confianza mutua con consecuencias jurídicas y financieras vinculantes. A continuación puedes consultar el marco normativo y las cláusulas aplicables como aval solidario:
            </p>
          </div>

          <div className="aval-terms-list">
            {clauses.map((clause, index) => {
              const IconComp = clause.icon;
              return (
                <div key={index} className="aval-clause-card">
                  <div className="aval-clause-card-icon" aria-hidden="true">
                    <IconComp size={18} />
                  </div>
                  <div className="aval-clause-card-content">
                    <h4>{clause.title}</h4>
                    <p>{clause.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="aval-terms-modal-footer">
          <Button
            className="button-secondary"
            onClick={handleClose}
            type="button"
          >
            Cerrar
          </Button>
          {!isAccepted && onAccept && (
            <Button
              className="icon-button"
              onClick={handleAccept}
              type="button"
            >
              <Check size={17} aria-hidden="true" />
              Aceptar términos y cerrar
            </Button>
          )}
        </div>
      </section>
    </div>,
    document.body
  );
}
