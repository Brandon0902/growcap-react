import { useState } from 'react';
import { firstFieldError, normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import GuidedRequestModal from '../../../components/common/GuidedRequestModal.jsx';
import Input from '../../../components/common/Input.jsx';
import RequestStartCard from '../../../components/common/RequestStartCard.jsx';
import WizardStep from '../../../components/common/WizardStep.jsx';
import { guarantorDocumentFields } from '../constants/loanDocuments.js';
import { createLoanRequest } from '../services/loanService.js';

const initialValues = {
  avalMethod: '',
  cantidad: '',
  codigo_aval: '',
  id_activo: '',
};

const totalSteps = 5;

function getPlanId(plan) {
  return plan?.id_activo || plan?.id_prestamo || plan?.id || plan?.id_plan;
}

function getPlanName(plan) {
  if (!plan) {
    return 'Sin plan';
  }

  if (typeof plan === 'string' || typeof plan === 'number') {
    return String(plan);
  }

  const nestedPlan = plan.plan || plan.prestamo || plan.tipo;

  if (nestedPlan && typeof nestedPlan === 'object') {
    return getPlanName(nestedPlan);
  }

  return plan.nombre || plan.label || plan.name || plan.titulo || plan.title || plan.tipo || `Plan ${getPlanId(plan)}`;
}

function LoanWizard({ onCreated, plans = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [files, setFiles] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = plans.find((plan) => String(getPlanId(plan)) === String(values.id_activo));

  const resetWizard = () => {
    setCurrentStep(0);
    setValues(initialValues);
    setFiles({});
    setFieldErrors({});
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError('');
  };

  const handleAvalMethodChange = (event) => {
    const { value } = event.target;

    setValues((current) => ({
      ...current,
      avalMethod: value,
      codigo_aval: value === 'documents' ? '' : current.codigo_aval,
    }));
    setFieldErrors((current) => ({
      ...current,
      codigo_aval: undefined,
      avalMethod: undefined,
      ...Object.fromEntries(guarantorDocumentFields.map((field) => [field.id, undefined])),
    }));
    setError('');

    if (value === 'code') {
      setFiles((current) => {
        const nextFiles = { ...current };
        guarantorDocumentFields.forEach((field) => {
          delete nextFiles[field.id];
        });
        return nextFiles;
      });
    }
  };

  const handleFileChange = (event) => {
    const { files: selectedFiles, name } = event.target;
    setFiles((current) => ({
      ...current,
      [name]: selectedFiles?.[0],
    }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError('');
  };

  const validateStep = (stepIndex) => {
    const nextErrors = {};

    if (stepIndex === 0 && !values.id_activo) {
      nextErrors.id_activo = 'Selecciona un plan de prestamo para continuar.';
    }

    if (stepIndex === 1 && (!values.cantidad || Number(values.cantidad) <= 0)) {
      nextErrors.cantidad = 'Indica el monto que necesitas.';
    }

    if (stepIndex === 2 && !values.avalMethod) {
      nextErrors.avalMethod = 'Elige como quieres validar tu aval.';
    }

    if (stepIndex === 3 && values.avalMethod === 'code' && !values.codigo_aval.trim()) {
      nextErrors.codigo_aval = 'Captura el codigo de aval.';
    }

    if (stepIndex === 3 && values.avalMethod === 'documents') {
      guarantorDocumentFields.forEach((field) => {
        if (!files[field.id]) {
          nextErrors[field.id] = `${field.label} es requerido.`;
        }
      });
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) {
      setError('Completa este paso para continuar.');
      return;
    }

    setError('');
    setCurrentStep((step) => Math.min(step + 1, totalSteps - 1));
  };

  const goBack = () => {
    setError('');
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const buildLoanPayload = () => {
    const payload = {
      cantidad: values.cantidad,
      id_activo: Number(values.id_activo),
    };

    if (values.avalMethod === 'code') {
      payload.codigo_aval = values.codigo_aval.trim();
      return payload;
    }

    guarantorDocumentFields.forEach((field) => {
      if (files[field.id]) {
        payload[field.id] = files[field.id];
      }
    });

    return payload;
  };

  const submitRequest = async () => {
    setError('');
    setMessage('');
    setFieldErrors({});

    for (let step = 0; step < totalSteps - 1; step += 1) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        setError('Revisa este dato antes de enviar la solicitud.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await createLoanRequest(buildLoanPayload());
      setMessage('Solicitud de prestamo enviada correctamente.');
      setIsOpen(false);
      resetWizard();
      onCreated?.();
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, 'No fue posible enviar la solicitud de prestamo.');
      setFieldErrors(normalized.fieldErrors);
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <WizardStep
          description="Elige el producto de prestamo que mejor se adapta a tu solicitud."
          question="Que plan de prestamo quieres usar?"
        >
          <div className="form-field">
            <label className="form-label" htmlFor="loan-plan">
              Plan de prestamo
            </label>
            <select
              className="input"
              id="loan-plan"
              name="id_activo"
              onChange={handleChange}
              value={values.id_activo}
            >
              <option value="">Selecciona un plan</option>
              {plans.map((plan, index) => {
                const id = getPlanId(plan);

                return (
                  <option key={id || index} value={id || ''}>
                    {getPlanName(plan)}
                  </option>
                );
              })}
            </select>
            {firstFieldError(fieldErrors, 'id_activo') && (
              <p className="form-error">{firstFieldError(fieldErrors, 'id_activo')}</p>
            )}
          </div>
        </WizardStep>
      );
    }

    if (currentStep === 1) {
      return (
        <WizardStep
          description="Escribe la cantidad que necesitas solicitar."
          question="Cuanto necesitas?"
        >
          <Input
            error={firstFieldError(fieldErrors, 'cantidad') || firstFieldError(fieldErrors, 'monto')}
            id="loan-amount"
            label="Monto solicitado"
            min="1"
            name="cantidad"
            onChange={handleChange}
            step="0.01"
            type="number"
            value={values.cantidad}
          />
        </WizardStep>
      );
    }

    if (currentStep === 2) {
      return (
        <WizardStep
          description="Puedes validar tu aval con un codigo existente o subir sus documentos. Solo necesitas una opcion."
          question="Como quieres validar tu aval?"
        >
          <div className="guided-choice-grid">
            {[
              { value: 'code', title: 'Codigo de aval', description: 'Ya tengo un codigo para validar al aval.' },
              { value: 'documents', title: 'Documentos del aval', description: 'Subire los archivos del aval ahora.' },
            ].map((option) => (
              <label className={values.avalMethod === option.value ? 'guided-choice selected' : 'guided-choice'} key={option.value}>
                <input
                  checked={values.avalMethod === option.value}
                  name="avalMethod"
                  onChange={handleAvalMethodChange}
                  type="radio"
                  value={option.value}
                />
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </div>
          {firstFieldError(fieldErrors, 'avalMethod') && (
            <p className="form-error">{firstFieldError(fieldErrors, 'avalMethod')}</p>
          )}
        </WizardStep>
      );
    }

    if (currentStep === 3 && values.avalMethod === 'code') {
      return (
        <WizardStep
          description="Captura el codigo que te compartio tu aval."
          question="Cual es tu codigo de aval?"
        >
          <Input
            error={firstFieldError(fieldErrors, 'codigo_aval')}
            id="loan-guarantor"
            label="Codigo de aval"
            name="codigo_aval"
            onChange={handleChange}
            placeholder="Ej. AVAL-123"
            value={values.codigo_aval}
          />
        </WizardStep>
      );
    }

    if (currentStep === 3) {
      return (
        <WizardStep
          description="Adjunta solo los documentos del aval. No pediremos codigo."
          question="Sube los documentos del aval"
        >
          <div className="guided-file-grid">
            {guarantorDocumentFields.map((field) => (
              <div className="form-field" key={field.id}>
                <label className="form-label" htmlFor={field.id}>
                  {field.label}
                </label>
                <input
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="input"
                  id={field.id}
                  name={field.id}
                  onChange={handleFileChange}
                  type="file"
                />
                {files[field.id] && <span className="guided-file-name">{files[field.id].name}</span>}
                {firstFieldError(fieldErrors, field.id) && (
                  <p className="form-error">{firstFieldError(fieldErrors, field.id)}</p>
                )}
              </div>
            ))}
          </div>
        </WizardStep>
      );
    }

    return (
      <WizardStep
        description="Confirma los datos antes de enviar tu solicitud."
        question="Listo para enviar?"
      >
        <dl className="guided-summary">
          <div>
            <dt>Plan elegido</dt>
            <dd>{getPlanName(selectedPlan)}</dd>
          </div>
          <div>
            <dt>Monto</dt>
            <dd>{values.cantidad || 'Sin capturar'}</dd>
          </div>
          <div>
            <dt>Aval</dt>
            <dd>{values.avalMethod === 'documents' ? 'Documentos del aval' : 'Codigo de aval'}</dd>
          </div>
          {values.avalMethod === 'code' && (
            <div>
              <dt>Codigo</dt>
              <dd>{values.codigo_aval || 'Sin capturar'}</dd>
            </div>
          )}
          {values.avalMethod === 'documents' && (
            <div>
              <dt>Documentos</dt>
              <dd>{guarantorDocumentFields.filter((field) => files[field.id]).length} archivos listos</dd>
            </div>
          )}
        </dl>
      </WizardStep>
    );
  };

  return (
    <>
      <RequestStartCard
        disabled={plans.length === 0}
        onStart={() => {
          setMessage('');
          setIsOpen(true);
        }}
        title="Solicitar prestamo"
      >
        {message && <Alert type="success">{message}</Alert>}
      </RequestStartCard>

      <GuidedRequestModal
        error={error}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        stepIndex={currentStep}
        title="Solicitud de prestamo"
        totalSteps={totalSteps}
        footer={(
          <>
            <Button className="button-secondary guided-action" disabled={currentStep === 0 || isSubmitting} onClick={goBack}>
              Atras
            </Button>
            {currentStep === totalSteps - 1 ? (
              <Button className="guided-action" disabled={isSubmitting} onClick={submitRequest}>
                {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
              </Button>
            ) : (
              <Button className="guided-action" onClick={goNext}>
                Siguiente
              </Button>
            )}
          </>
        )}
      >
        {renderStep()}
      </GuidedRequestModal>
    </>
  );
}

export default LoanWizard;
