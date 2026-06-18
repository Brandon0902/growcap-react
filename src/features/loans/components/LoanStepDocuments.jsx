import { firstFieldError } from '../../../api/apiUtils.js';
import { guarantorDocumentFields } from '../constants/loanDocuments.js';

function LoanStepDocuments({ fieldErrors = {}, onFileChange, values = {} }) {
  const shouldShowGuarantorDocuments = values.avalMethod === 'documents';

  return (
    <div className="step">
      <h3>Documentos</h3>
      <p>
        {shouldShowGuarantorDocuments
          ? 'Adjunta los documentos del aval para validar esta solicitud.'
          : 'Validaremos tu aval con el codigo capturado. No necesitas subir documentos del aval.'}
      </p>
      <div className="form">
        {shouldShowGuarantorDocuments ? (
          guarantorDocumentFields.map((field) => (
            <div className="form-field" key={field.id}>
              <label className="form-label" htmlFor={field.id}>
                {field.label}
              </label>
              <input
                accept=".jpg,.jpeg,.png,.pdf"
                className="input"
                id={field.id}
                name={field.id}
                onChange={onFileChange}
                required
                type="file"
              />
              {firstFieldError(fieldErrors, field.id) && (
                <p className="form-error">{firstFieldError(fieldErrors, field.id)}</p>
              )}
            </div>
          ))
        ) : (
          <div className="aval-document-note">
            <strong>Codigo de aval seleccionado</strong>
            <span>Este paso no requiere archivos del aval.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoanStepDocuments;
