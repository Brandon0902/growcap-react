import { FileText, Scale, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/common/Button.jsx';

function BeneficiariesTermsModal({ isOpen, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="monochrome-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby="beneficiaries-terms-title"
        aria-modal="true"
        className="monochrome-modal-dialog"
        ref={modalRef}
        role="dialog"
      >
        {/* Encabezado sobrio monocromático */}
        <div className="monochrome-modal-header">
          <div className="monochrome-header-info">
            <div className="monochrome-icon-badge" aria-hidden="true">
              <Scale size={20} />
            </div>
            <div>
              <span className="monochrome-kicker">Marco Legal y Regulatorio</span>
              <h2 id="beneficiaries-terms-title">Términos y Condiciones de Beneficiarios</h2>
            </div>
          </div>

          <Button
            aria-label="Cerrar modal"
            className="monochrome-modal-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        {/* Cuerpo del documento legal con scroll independiente */}
        <div className="monochrome-modal-body">
          <div className="monochrome-meta-badge">
            <ShieldCheck size={16} />
            <span>Documento oficial de designación patrimonial · GrowCap</span>
          </div>

          <p className="monochrome-lead">
            El presente instrumento establece las bases normativas, requisitos probatorios y directrices aplicables a la designación, sustitución y liquidación de beneficiarios sobre los fondos, cuentas de ahorro, pólizas de inversión y rendimientos generados en la plataforma GrowCap.
          </p>

          <div className="monochrome-legal-sections">
            <article className="monochrome-clause">
              <h3>Cláusula Primera · Naturaleza Jurídica y Facultad de Designación</h3>
              <p>
                El Titular de la cuenta ostenta la facultad libre, voluntaria e irrestricta de designar a las personas físicas que habrán de recibir los saldos líquidos, aportaciones y rendimientos acumulados en sus instrumentos financieros en caso de fallecimiento, con plena validez jurídica conforme a la legislación mercantil y civil aplicable.
              </p>
            </article>

            <article className="monochrome-clause">
              <h3>Cláusula Segunda · Regla de Distribución Porcentual Estricta (100.00%)</h3>
              <p>
                La distribución asignada entre los beneficiarios registrados debe sumar en todo momento exactamente el <strong>100.00% (cien por ciento)</strong>. No se admitirán remanentes sin asignar ni excedentes. En caso de fallecimiento previo de alguno de los beneficiarios respecto al Titular (premoriencia), el porcentaje correspondiente acrecerá de forma proporcional en favor del o los beneficiarios supervivientes registrados.
              </p>
            </article>

            <article className="monochrome-clause">
              <h3>Cláusula Tercera · Beneficiarios Menores de Edad y Patria Potestad</h3>
              <p>
                En el supuesto de que el Titular designe a personas menores de 18 (dieciocho) años de edad o sujetas a estado de interdicción legal al momento de la exigibilidad de los fondos, la entrega patrimonial no se realizará en forma directa al menor, sino a quien ejerza de manera comprobable la patria potestad o tutela legal legítimamente decretada por autoridad jurisdiccional competente.
              </p>
            </article>

            <article className="monochrome-clause">
              <h3>Cláusula Cuarta · Requisitos Probatorios y Procedimiento de Reclamación</h3>
              <p>
                Para iniciar el trámite formal de reclamo y dispersión de recursos, el o los beneficiarios registrados deberán comparecer ante la Dirección Jurídica y Mesa de Control de GrowCap exhibiendo la siguiente documentación original o copia certificada:
              </p>
              <ul className="monochrome-doc-list">
                <li>Copia certificada del <strong>Acta de Defunción</strong> del Titular debidamente inscrita en el Registro Civil.</li>
                <li><strong>Identificación oficial con fotografía vigente</strong> del beneficiario reclamante (Credencial INE o Pasaporte mexicano).</li>
                <li><strong>Comprobante de domicilio reciente</strong> no mayor a 90 días naturales.</li>
                <li><strong>Carátula de estado de cuenta bancario con CLABE</strong> interbancaria activa a nombre exclusivo del beneficiario para la transferencia electrónica de fondos (SPEI).</li>
              </ul>
            </article>

            <article className="monochrome-clause">
              <h3>Cláusula Quinta · Revocabilidad Plena y Prelación Temporal</h3>
              <p>
                La designación de beneficiarios es enteramente revocable y modificable por el Titular en cualquier momento a través de su cuenta digital o en sucursal mientras se encuentre con vida. La confirmación de una nueva designación en el sistema sustituye, invalida y deja sin ningún efecto legal a cualquier designación previamente grabada.
              </p>
            </article>

            <article className="monochrome-clause">
              <h3>Cláusula Sexta · Confidencialidad y Protección de Datos Personales</h3>
              <p>
                Los datos personales y de localización de los beneficiarios proporcionados por el Titular se encuentran resguardados con estricto apego a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Dicha información será utilizada con exclusividad para fines de localización, notificación y liquidación de derechos patrimoniales.
              </p>
            </article>
          </div>
        </div>

        {/* Pie monocromático */}
        <div className="monochrome-modal-footer">
          <div className="monochrome-footer-note">
            <FileText size={15} />
            <span>GrowCap Servicios Financieros · Versión Jurídica Vigente</span>
          </div>
          <Button
            className="monochrome-button-confirm"
            onClick={onClose}
            type="button"
          >
            Entendido y conforme
          </Button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export default BeneficiariesTermsModal;
