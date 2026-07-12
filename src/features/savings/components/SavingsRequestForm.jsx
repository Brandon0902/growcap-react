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
import { createSavingsCheckout, createSavingsRequest } from '../services/savingsService.js';
import { buildSavingsCheckoutPayload, buildSavingsRequestPayload, formatSavingsRequestError } from '../services/savingsRequest.js';
import { getSavingsPlanPeriod } from '../services/savingsPlanDisplay.js';

const initialValues = {
  ahorro_id: '',
  cuota: '',
  fecha_fin: '',
  monto_inicial: '',
  payment_method: 'later',
};

const baseTotalSteps = 5;
const percentFields = ['porcentaje', 'porcentaje_1', 'tasa', 'tasa_interes', 'rendimiento', 'interes', 'interes_anual', 'percentage'];
const minFeeFields = [
  'cuota_minima',
  'cuota_min',
  'monto_minimo',
  'monto_min',
  'monto_minimo_ahorro',
  'monto_ahorro_minimo',
  'minimo',
  'cantidad_minima',
  'aportacion_minima',
  'cuota',
];
const seasonalTextFields = ['tipo_ahorro', 'tipo', 'label', 'nombre'];
const seasonalBooleanFields = ['temporada', 'es_temporada', 'is_temporada'];

function getPlanId(plan) {
  return plan?.ahorro_id || plan?.id_ahorro || plan?.id || plan?.id_plan;
}

function getPlanName(plan) {
  if (!plan) {
    return 'Sin plan';
  }

  if (typeof plan === 'string' || typeof plan === 'number') {
    return String(plan);
  }

  const nestedPlan = plan.plan || plan.ahorro || plan.tipo_ahorro;

  if (nestedPlan && typeof nestedPlan === 'object') {
    return getPlanName(nestedPlan);
  }

  return plan.nombre || plan.label || plan.name || plan.titulo || plan.title || plan.tipo_ahorro || `Plan ${getPlanId(plan)}`;
}

function getPlanValue(plan, fields) {
  const field = fields.find((key) => plan?.[key] !== undefined && plan?.[key] !== null && plan?.[key] !== '');
  return field ? plan[field] : null;
}

function hasSeasonalText(value) {
  if (value && typeof value === 'object') {
    return isSeasonalPlan(value);
  }

  return String(value || '').toLowerCase().includes('temporada');
}

function isSeasonalPlan(plan) {
  if (!plan) {
    return false;
  }

  const hasSeasonalFlag = seasonalBooleanFields.some((field) => {
    const value = plan[field];

    return value === true || value === 1 || String(value).toLowerCase() === 'true';
  });

  if (hasSeasonalFlag) {
    return true;
  }

  const hasNestedSeasonalPlan = [plan.plan, plan.ahorro, plan.tipo_ahorro, plan.tipo]
    .some((nestedPlan) => nestedPlan && typeof nestedPlan === 'object' && isSeasonalPlan(nestedPlan));

  if (hasNestedSeasonalPlan) {
    return true;
  }

  return seasonalTextFields.some((field) => hasSeasonalText(plan[field]));
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
    return '$0.00';
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

function getPaymentLabel(value) {
  if (value === 'saldo') {
    return 'Saldo disponible';
  }

  if (value === 'stripe') {
    return 'Stripe';
  }

  return 'Definir despues';
}

function SavingsRequestForm({ onCreated, plans = [], suggestedFrequency }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = plans.find((plan) => String(getPlanId(plan)) === String(values.ahorro_id));
  const planYield = getPlanValue(selectedPlan, percentFields);
  const planPeriod = getSavingsPlanPeriod(selectedPlan);
  const minFee = getNumericValue(getPlanValue(selectedPlan, minFeeFields));
  const feeAmount = Number(values.cuota || 0);
  const initialAmount = Number(values.monto_inicial || 0);
  const totalNow = feeAmount + initialAmount;
  const isSeasonal = isSeasonalPlan(selectedPlan);
  const dateEndStep = 3;
  const summaryStep = isSeasonal ? 4 : 3;
  const paymentStep = isSeasonal ? 5 : 4;
  const totalSteps = isSeasonal ? baseTotalSteps + 1 : baseTotalSteps;

  const resetWizard = () => {
    setCurrentStep(0);
    setValues(initialValues);
    setFieldErrors({});
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({
      ...current,
      [name]: value,
      ...(name === 'ahorro_id' ? { fecha_fin: '' } : {}),
    }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError('');
  };

  const validateStep = (stepIndex) => {
    const nextErrors = {};
    const parsedFee = Number(values.cuota);
    const parsedInitialAmount = values.monto_inicial === '' ? 0 : Number(values.monto_inicial);

    if (stepIndex === 0 && !values.ahorro_id) {
      nextErrors.ahorro_id = 'Selecciona un plan para continuar.';
    }

    if (stepIndex === 1 && (!values.cuota || !Number.isFinite(parsedFee) || parsedFee <= 0)) {
      nextErrors.cuota = 'Indica la cuota que quieres pagar.';
    }

    if (stepIndex === 1 && minFee !== null && Number.isFinite(parsedFee) && parsedFee < minFee) {
      nextErrors.cuota = 'La cuota debe ser mayor o igual al minimo del plan.';
    }

    if (stepIndex === 2 && values.monto_inicial !== '' && (!Number.isFinite(parsedInitialAmount) || parsedInitialAmount < 0)) {
      nextErrors.monto_inicial = 'El monto inicial debe ser 0 o mayor, o dejarse vacio.';
    }

    if (isSeasonal && stepIndex === dateEndStep && !values.fecha_fin) {
      nextErrors.fecha_fin = 'Indica la fecha fin del ahorro de temporada.';
    }

    if (stepIndex === paymentStep && !values.payment_method) {
      nextErrors.payment_method = 'Elige como quieres pagar.';
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

  const buildPayload = () => buildSavingsRequestPayload(values, suggestedFrequency, isSeasonal);

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    setFieldErrors({});

    for (let step = 0; step < totalSteps; step += 1) {
      if (step === summaryStep) {
        continue;
      }

      if (!validateStep(step)) {
        setCurrentStep(step);
        setError('Revisa este dato antes de enviar la solicitud.');
        return;
      }
    }

    setIsSubmitting(true);
    let requestStage = 'create';

    try {
      const created = await createSavingsRequest(buildPayload());

      if (values.payment_method === 'stripe') {
        const savingsId = extractResourceId(created, ['id', 'id_ahorro', 'ahorro_id']);

        if (!savingsId) {
          throw new Error('No se pudo iniciar Stripe Checkout porque la API no devolvio el ID del ahorro.');
        }

        const action = created?.action ?? created?.data?.action ?? 'create';
        requestStage = 'checkout';
        const checkout = await createSavingsCheckout(savingsId, buildSavingsCheckoutPayload({
          action,
          savingsId,
          cuota: values.cuota,
          monto_inicial: values.monto_inicial,
          oldSubscriptionId: created?.ahorro?.stripe_subscription_id ?? created?.data?.ahorro?.stripe_subscription_id,
          origin: window.location.origin,
        }));
        const checkoutUrl = extractCheckoutUrl(checkout);

        if (!checkoutUrl) {
          throw new Error('La API no devolvio la URL de Stripe Checkout.');
        }

        setMessage('Te enviaremos a Stripe Checkout para completar el pago.');
        window.location.href = checkoutUrl;
        return;
      }

      setMessage('Solicitud de ahorro enviada correctamente.');
      setIsOpen(false);
      resetWizard();
      onCreated?.();
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, 'No fue posible enviar la solicitud de ahorro.');
      setFieldErrors(normalized.fieldErrors);
      setError(formatSavingsRequestError(requestStage, normalized.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPlanInfo = () => selectedPlan && (
    <div className="plan-info-grid" aria-live="polite">
      <div>
        <span>Nombre</span>
        <strong>{getPlanName(selectedPlan)}</strong>
      </div>
      <div>
        <span>Periodo</span>
        <strong>{formatPlanValue(planPeriod)}</strong>
      </div>
      <div>
        <span>Rendimiento</span>
        <strong>{formatPercent(planYield)}</strong>
      </div>
      <div>
        <span>Cuota minima</span>
        <strong>{minFee !== null ? formatMoney(minFee) : 'No especificado'}</strong>
      </div>
    </div>
  );

  const renderSummary = () => (
    <dl className="guided-summary">
      <div>
        <dt>Plan seleccionado</dt>
        <dd>{getPlanName(selectedPlan)}</dd>
      </div>
      <div>
        <dt>Periodo</dt>
        <dd>{formatPlanValue(planPeriod)}</dd>
      </div>
      <div>
        <dt>Rendimiento</dt>
        <dd>{formatPercent(planYield)}</dd>
      </div>
      <div>
        <dt>Cuota obligatoria</dt>
        <dd>{formatMoney(values.cuota)}</dd>
      </div>
      <div>
        <dt>Monto inicial opcional</dt>
        <dd>{initialAmount > 0 ? formatMoney(initialAmount) : '$0.00'}</dd>
      </div>
      {isSeasonal && (
        <div>
          <dt>Fecha fin</dt>
          <dd>{values.fecha_fin || 'Sin capturar'}</dd>
        </div>
      )}
      <div className="guided-summary-total">
        <dt>Total estimado a pagar ahora con Stripe</dt>
        <dd>{formatMoney(totalNow)}</dd>
      </div>
    </dl>
  );

  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <WizardStep
          description="Elige una opcion disponible. La cuota minima, periodo y rendimiento vienen del plan."
          question="Que plan de ahorro quieres elegir?"
        >
          <div className="form-field">
            <label className="form-label" htmlFor="savings-plan">
              Plan de ahorro
            </label>
            <select
              className="input"
              id="savings-plan"
              name="ahorro_id"
              onChange={handleChange}
              value={values.ahorro_id}
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
            {firstFieldError(fieldErrors, 'ahorro_id') && (
              <p className="form-error">{firstFieldError(fieldErrors, 'ahorro_id')}</p>
            )}
          </div>
          {renderPlanInfo()}
        </WizardStep>
      );
    }

    if (currentStep === 1) {
      return (
        <WizardStep
          description="Esta cuota es obligatoria y se usara para el cobro automatico."
          question="Cual sera tu cuota?"
        >
          <Input
            error={firstFieldError(fieldErrors, 'cuota')}
            id="savings-fee"
            label="Cuota obligatoria"
            min={minFee ?? 1}
            name="cuota"
            onChange={handleChange}
            step="0.01"
            type="number"
            value={values.cuota}
          />
          {minFee !== null && (
            <p className="guided-help">Minimo del plan: {formatMoney(minFee)}</p>
          )}
        </WizardStep>
      );
    }

    if (currentStep === 2) {
      return (
        <WizardStep
          description="Este monto es opcional y se cobra adicional a la cuota. Puedes dejarlo vacio."
          question="Quieres agregar un monto inicial?"
        >
          <Input
            error={firstFieldError(fieldErrors, 'monto_inicial')}
            id="savings-initial-amount"
            label="Monto inicial opcional"
            min="0"
            name="monto_inicial"
            onChange={handleChange}
            placeholder="Opcional"
            step="0.01"
            type="number"
            value={values.monto_inicial}
          />
          <p className="guided-help">Puede ser $0.00 o quedar vacio; no se compara contra el minimo del plan.</p>
        </WizardStep>
      );
    }

    if (isSeasonal && currentStep === dateEndStep) {
      return (
        <WizardStep
          description="Esta fecha se enviara con la solicitud del ahorro de temporada."
          question="Cuando termina tu ahorro de temporada?"
        >
          <Input
            error={firstFieldError(fieldErrors, 'fecha_fin')}
            id="savings-end-date"
            label="Fecha fin"
            name="fecha_fin"
            onChange={handleChange}
            type="date"
            value={values.fecha_fin}
          />
        </WizardStep>
      );
    }

    if (currentStep === summaryStep) {
      return (
        <WizardStep
          description="Confirma la cuota y el monto inicial antes de elegir el metodo de pago."
          question="Revisa tu solicitud"
        >
          {renderSummary()}
        </WizardStep>
      );
    }

    if (currentStep === paymentStep) {
      return (
        <WizardStep
          description="Si eliges Stripe, el checkout considera la cuota y el monto inicial opcional."
          question="Como quieres pagar?"
        >
          <div className="guided-choice-grid">
            {[
              { value: 'stripe', title: 'Stripe', description: 'Pagar cuota y monto inicial en Checkout.' },
              { value: 'saldo', title: 'Saldo disponible', description: 'Usar mi saldo en Growcap.' },
              { value: 'later', title: 'Definir despues', description: 'Enviar la solicitud sin pago ahora.' },
            ].map((option) => (
              <label className={values.payment_method === option.value ? 'guided-choice selected' : 'guided-choice'} key={option.value}>
                <input
                  checked={values.payment_method === option.value}
                  name="payment_method"
                  onChange={handleChange}
                  type="radio"
                  value={option.value}
                />
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </label>
            ))}
          </div>
          {renderSummary()}
          <dl className="guided-summary compact">
            <div>
              <dt>Metodo de pago</dt>
              <dd>{getPaymentLabel(values.payment_method)}</dd>
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
        title="Solicitar ahorro"
      >
        {message && <Alert type="success">{message}</Alert>}
      </RequestStartCard>

      <GuidedRequestModal
        error={error}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        stepIndex={currentStep}
        title="Solicitud de ahorro"
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

export default SavingsRequestForm;
