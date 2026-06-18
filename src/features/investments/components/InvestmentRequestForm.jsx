import { useState } from 'react';
import {
  extractCheckoutUrl,
  extractResourceId,
  firstFieldError,
  normalizeApiError,
} from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import GuidedRequestModal from '../../../components/common/GuidedRequestModal.jsx';
import Input from '../../../components/common/Input.jsx';
import RequestStartCard from '../../../components/common/RequestStartCard.jsx';
import WizardStep from '../../../components/common/WizardStep.jsx';
import { createInvestmentCheckout, createInvestmentRequest } from '../services/investmentService.js';

const initialValues = {
  cantidad: '',
  id_activo: '',
  pay_method: 'later',
};

const totalSteps = 4;
const percentFields = ['porcentaje', 'porcentaje_1', 'tasa', 'tasa_interes', 'rendimiento', 'interes', 'interes_anual', 'percentage'];
const periodFields = ['plazo', 'periodo', 'tiempo', 'duracion', 'meses', 'dias', 'tiempo_minimo', 'frecuencia_pago'];
const minAmountFields = ['monto_minimo', 'monto_min', 'minimo', 'cantidad_minima', 'monto_minimo_inversion', 'monto'];
const maxAmountFields = ['monto_maximo', 'monto_max', 'maximo', 'cantidad_maxima', 'monto_maximo_inversion'];

function getPlanId(plan) {
  return plan?.id_activo || plan?.id_inversion || plan?.id || plan?.id_plan;
}

function getPlanName(plan) {
  if (!plan) {
    return 'Sin plan';
  }

  if (typeof plan === 'string' || typeof plan === 'number') {
    return String(plan);
  }

  const nestedPlan = plan.plan || plan.inversion || plan.tipo;

  if (nestedPlan && typeof nestedPlan === 'object') {
    return getPlanName(nestedPlan);
  }

  return plan.nombre || plan.label || plan.name || plan.titulo || plan.title || plan.tipo || `Plan ${getPlanId(plan)}`;
}

function getPlanValue(plan, fields) {
  const field = fields.find((key) => plan?.[key] !== undefined && plan?.[key] !== null && plan?.[key] !== '');
  return field ? plan[field] : null;
}

function getNumericValue(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    return getNumericValue(value.monto ?? value.cantidad ?? value.valor ?? value.minimo ?? value.maximo);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number(value.replace(/[$,%\s]/g, '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPlanValue(value, fallback = 'No especificado') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return value.nombre || value.label || value.name || value.titulo || value.title || value.valor || fallback;
  }

  return fallback;
}

function formatMoney(value) {
  const numeric = getNumericValue(value);

  if (numeric === null) {
    return null;
  }

  return new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(numeric);
}

function formatPercent(value) {
  const numeric = getNumericValue(value);

  if (numeric === null) {
    return formatPlanValue(value);
  }

  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(numeric)}%`;
}

function InvestmentRequestForm({ onCreated, plans = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = plans.find((plan) => String(getPlanId(plan)) === String(values.id_activo));
  const planYield = getPlanValue(selectedPlan, percentFields);
  const planPeriod = getPlanValue(selectedPlan, periodFields);
  const minAmount = getNumericValue(getPlanValue(selectedPlan, minAmountFields));
  const maxAmount = getNumericValue(getPlanValue(selectedPlan, maxAmountFields));

  const resetWizard = () => {
    setCurrentStep(0);
    setValues(initialValues);
    setFieldErrors({});
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError('');
  };

  const validateStep = (stepIndex) => {
    const nextErrors = {};

    if (stepIndex === 0 && !values.id_activo) {
      nextErrors.id_activo = 'Selecciona un plan para continuar.';
    }

    if (stepIndex === 1 && (!values.cantidad || Number(values.cantidad) <= 0)) {
      nextErrors.cantidad = 'Indica el monto que quieres invertir.';
    }

    if (stepIndex === 1 && minAmount !== null && Number(values.cantidad) < minAmount) {
      nextErrors.cantidad = `El monto minimo para este plan es ${formatMoney(minAmount)}.`;
    }

    if (stepIndex === 1 && maxAmount !== null && Number(values.cantidad) > maxAmount) {
      nextErrors.cantidad = `El monto maximo para este plan es ${formatMoney(maxAmount)}.`;
    }

    if (stepIndex === 3 && !values.pay_method) {
      nextErrors.pay_method = 'Elige como quieres pagar.';
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

  const buildPayload = () => ({
    id_activo: Number(values.id_activo),
    cantidad: values.cantidad,
    pay_method: values.pay_method === 'later' ? undefined : values.pay_method,
    tiempo: null,
  });

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    setFieldErrors({});

    for (let step = 0; step < totalSteps; step += 1) {
      if (step === 2) {
        continue;
      }

      if (!validateStep(step)) {
        setCurrentStep(step);
        setError('Revisa este dato antes de enviar la solicitud.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const created = await createInvestmentRequest(buildPayload());

      if (values.pay_method === 'stripe') {
        const investmentId = extractResourceId(created, ['id', 'id_inversion', 'inversion_id']);

        if (!investmentId) {
          throw new Error('No se pudo iniciar Stripe Checkout porque la API no devolvio el ID de la inversion.');
        }

        const returnUrl = `${window.location.origin}/inversion/stripe/return?inversion_id=${investmentId}`;
        const checkout = await createInvestmentCheckout(investmentId, {
          return_url: returnUrl,
        });
        const checkoutUrl = extractCheckoutUrl(checkout);

        if (!checkoutUrl) {
          throw new Error('La API no devolvio la URL de Stripe Checkout.');
        }

        setMessage('Te enviaremos a Stripe Checkout para completar el pago.');
        window.location.href = checkoutUrl;
        return;
      }

      setMessage('Solicitud de inversion enviada correctamente.');
      setIsOpen(false);
      resetWizard();
      onCreated?.();
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, 'No fue posible enviar la solicitud de inversion.');
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
          description="Elige una opcion disponible. Despues te pediremos el monto."
          question="Que plan quieres elegir?"
        >
          <div className="form-field">
            <label className="form-label" htmlFor="investment-plan">
              Plan elegido
            </label>
            <select
              className="input"
              id="investment-plan"
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
          {selectedPlan && (
            <div className="plan-info-grid" aria-live="polite">
              <div>
                <span>Rendimiento</span>
                <strong>{formatPercent(planYield)}</strong>
              </div>
              <div>
                <span>Periodo</span>
                <strong>{formatPlanValue(planPeriod)}</strong>
              </div>
            </div>
          )}
        </WizardStep>
      );
    }

    if (currentStep === 1) {
      return (
        <WizardStep
          description="Escribe la cantidad que quieres poner a trabajar."
          question="Cuanto quieres invertir?"
        >
          <Input
            error={firstFieldError(fieldErrors, 'cantidad') || firstFieldError(fieldErrors, 'monto')}
            id="investment-amount"
            label="Monto a invertir"
            min={minAmount ?? 1}
            max={maxAmount ?? undefined}
            name="cantidad"
            onChange={handleChange}
            step="0.01"
            type="number"
            value={values.cantidad}
          />
          {(minAmount !== null || maxAmount !== null) && (
            <p className="guided-help">
              {minAmount !== null && `Minimo ${formatMoney(minAmount)}`}
              {minAmount !== null && maxAmount !== null ? ' - ' : ''}
              {maxAmount !== null && `Maximo ${formatMoney(maxAmount)}`}
            </p>
          )}
        </WizardStep>
      );
    }

    if (currentStep === 2) {
      return (
        <WizardStep
          description="Estos datos vienen del plan seleccionado. Tu solo confirmas que todo este correcto."
          question="Revisa tu solicitud"
        >
          <dl className="guided-summary">
            <div>
              <dt>Plan seleccionado</dt>
              <dd>{getPlanName(selectedPlan)}</dd>
            </div>
            <div>
              <dt>Periodo del plan</dt>
              <dd>{formatPlanValue(planPeriod)}</dd>
            </div>
            <div>
              <dt>Rendimiento del plan</dt>
              <dd>{formatPercent(planYield)}</dd>
            </div>
            <div>
              <dt>Monto</dt>
              <dd>{values.cantidad || 'Sin capturar'}</dd>
            </div>
          </dl>
        </WizardStep>
      );
    }

    if (currentStep === 3) {
      return (
        <WizardStep
          description="Puedes elegir una forma de pago ahora o dejarla para despues."
          question="Como quieres pagar?"
        >
          <div className="guided-choice-grid">
            {[
              { value: 'saldo', title: 'Saldo disponible', description: 'Usar mi saldo en Growcap.' },
              { value: 'stripe', title: 'Stripe', description: 'Pagar con tarjeta o metodo externo.' },
              { value: 'later', title: 'Definir despues', description: 'Enviar la solicitud sin pago ahora.' },
            ].map((option) => (
              <label className={values.pay_method === option.value ? 'guided-choice selected' : 'guided-choice'} key={option.value}>
                <input
                  checked={values.pay_method === option.value}
                  name="pay_method"
                  onChange={handleChange}
                  type="radio"
                  value={option.value}
                />
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </div>
          <dl className="guided-summary compact">
            <div>
              <dt>Resumen</dt>
              <dd>
                {getPlanName(selectedPlan)} - {values.cantidad || 'Sin monto'} - {formatPlanValue(planPeriod)}
              </dd>
            </div>
          </dl>
        </WizardStep>
      );
    }

    return null;
  };

  return (
    <>
      <RequestStartCard
        disabled={plans.length === 0}
        onStart={() => {
          setMessage('');
          setIsOpen(true);
        }}
        title="Solicitar inversion"
      >
        {message && <Alert type="success">{message}</Alert>}
      </RequestStartCard>

      <GuidedRequestModal
        error={error}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        stepIndex={currentStep}
        title="Solicitud de inversion"
        totalSteps={totalSteps}
        footer={(
          <>
            <Button className="button-secondary guided-action" disabled={currentStep === 0 || isSubmitting} onClick={goBack}>
              Atras
            </Button>
            {currentStep === totalSteps - 1 ? (
              <Button className="guided-action" disabled={isSubmitting} onClick={handleSubmit}>
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

export default InvestmentRequestForm;
