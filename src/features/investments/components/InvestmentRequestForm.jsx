import { useState, forwardRef, useImperativeHandle, useCallback, useEffect } from 'react';
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
import WizardStep from '../../../components/common/WizardStep.jsx';
import { getClienteSaldoDisponible } from '../../dashboard/services/dashboardService.js';
import DepositModal from '../../deposits/components/DepositModal.jsx';
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

function getPlanMonths(plan) {
  if (!plan) return 12;
  const rawPeriod = plan.periodo ?? plan.plazo ?? plan.tiempo ?? plan.duracion ?? plan.meses;
  if (typeof rawPeriod === 'number' && rawPeriod > 0) return rawPeriod;
  if (typeof rawPeriod === 'string') {
    const rawLower = rawPeriod.toLowerCase();
    if (rawLower.includes('semana')) {
      const match = rawLower.match(/(\d+)/);
      if (match) return Number(match[1]) / 4.33;
    }
    if (rawLower.includes('año')) {
      const match = rawLower.match(/(\d+)/);
      if (match) return Number(match[1]) * 12;
    }
    const match = rawPeriod.match(/(\d+)/);
    if (match) return Number(match[1]);
  }
  return 12;
}

function calculateProjections(amount, annualRatePercent, months) {
  const numAmount = Number(amount || 0);
  const rate = Number(annualRatePercent || 0);
  const numMonths = Number(months || 12);

  if (numAmount <= 0 || rate <= 0) {
    return {
      amount: numAmount,
      gain: 0,
      total: numAmount,
      endDate: null,
    };
  }

  const monthlyRate = rate / 100 / 12;
  const gain = Number((numAmount * monthlyRate * numMonths).toFixed(2));
  const total = Number((numAmount + gain).toFixed(2));

  const end = new Date();
  end.setMonth(end.getMonth() + Math.round(numMonths));

  return {
    amount: numAmount,
    gain,
    total,
    endDate: end.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
}

const InvestmentRequestForm = forwardRef(({ onCreated, plans = [] }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liquidBalance, setLiquidBalance] = useState(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  const loadLiquidBalance = useCallback(async () => {
    try {
      const res = await getClienteSaldoDisponible();
      const bal = Number(res?.data?.total ?? res?.data?.saldo_disponible ?? 0);
      setLiquidBalance(bal);
    } catch {
      setLiquidBalance(0);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadLiquidBalance();
    }
  }, [isOpen, loadLiquidBalance]);

  useImperativeHandle(ref, () => ({
    openWithPlan: (planId) => {
      const targetPlan = plans.find((p) => String(getPlanId(p)) === String(planId));
      const minAmt = getNumericValue(getPlanValue(targetPlan, minAmountFields));
      setValues((current) => ({
        ...current,
        id_activo: planId,
        cantidad: current.cantidad && Number(current.cantidad) > 0 ? current.cantidad : (minAmt ? String(minAmt) : '10000'),
      }));
      setMessage('');
      setError('');
      setFieldErrors({});
      setCurrentStep(1); // Inicia directamente en el paso de "¿Cuánto quieres invertir?"
      setIsOpen(true);
    }
  }));

  const selectedPlan = plans.find((plan) => String(getPlanId(plan)) === String(values.id_activo));
  const planYield = getPlanValue(selectedPlan, percentFields);
  const planPeriod = getPlanValue(selectedPlan, periodFields);
  const minAmount = getNumericValue(getPlanValue(selectedPlan, minAmountFields));
  const maxAmount = getNumericValue(getPlanValue(selectedPlan, maxAmountFields));

  const planMonths = getPlanMonths(selectedPlan);
  const projections = calculateProjections(values.cantidad, planYield, planMonths);

  const sliderMin = minAmount ?? 10000;
  const sliderMax = maxAmount ?? Math.max(sliderMin * 10, 300000);
  const sliderStep = sliderMax > 50000 ? 1000 : 500;

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

    if (stepIndex === 3) {
      if (!values.pay_method) {
        nextErrors.pay_method = 'Elige como quieres pagar.';
      } else if (values.pay_method === 'saldo' && liquidBalance !== null && Number(values.cantidad) > liquidBalance) {
        nextErrors.pay_method = `Saldo disponible insuficiente ($${liquidBalance.toFixed(2)} MXN disponibles de $${Number(values.cantidad).toFixed(2)} MXN requeridos). Carga saldo con un depósito o elige 'Definir después'.`;
      }
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

        const returnUrl = `${window.location.origin}/inversion/stripe/return`;
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

      if (values.pay_method === 'saldo') {
        setMessage('Inversión creada y activada con saldo disponible exitosamente.');
      } else {
        setMessage('Solicitud de inversion enviada correctamente.');
      }
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
      const currentAmountNum = Number(values.cantidad || sliderMin);

      return (
        <WizardStep
          description="Ajusta la cantidad a invertir con el teclado o deslizando la barra."
          question="¿Cuánto quieres invertir?"
        >
          <Input
            error={firstFieldError(fieldErrors, 'cantidad') || firstFieldError(fieldErrors, 'monto')}
            id="investment-amount"
            label="Monto a invertir"
            min={minAmount ?? 1}
            max={maxAmount ?? undefined}
            name="cantidad"
            onChange={handleChange}
            step="100"
            type="number"
            value={values.cantidad}
          />

          <div style={{ marginTop: '14px', marginBottom: '8px' }}>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={sliderStep}
              value={Math.min(sliderMax, Math.max(sliderMin, currentAmountNum))}
              onChange={(e) => {
                setValues((curr) => ({ ...curr, cantidad: e.target.value }));
                setFieldErrors((curr) => ({ ...curr, cantidad: undefined, monto: undefined }));
                setError('');
              }}
              style={{
                width: '100%',
                accentColor: 'var(--color-primary, #9333ea)',
                cursor: 'pointer',
                height: '6px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              <span>Mín. {formatMoney(sliderMin)}</span>
              <span>Máx. {formatMoney(sliderMax)}</span>
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Tu ganancia estimada ({formatPercent(planYield)} anual)
              </span>
              <strong style={{ fontSize: '0.92rem', color: '#166534', fontWeight: 600 }}>
                +{formatMoney(projections.gain)} MXN
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
                Total a recibir al término
              </span>
              <strong style={{ fontSize: '1.12rem', color: 'var(--color-primary-dark, #581c87)', fontWeight: 700 }}>
                {formatMoney(projections.total)} MXN
              </strong>
            </div>
          </div>
        </WizardStep>
      );
    }

    if (currentStep === 2) {
      return (
        <WizardStep
          description="Verifica los parámetros y la proyección estimada antes de continuar."
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
              <dt>Rendimiento anual</dt>
              <dd>{formatPercent(planYield)}</dd>
            </div>
            <div>
              <dt>Monto a invertir</dt>
              <dd>{formatMoney(projections.amount) || 'Sin capturar'}</dd>
            </div>
            <div>
              <dt>Ganancia estimada</dt>
              <dd style={{ color: '#166534', fontWeight: 600 }}>
                +{formatMoney(projections.gain)} MXN
              </dd>
            </div>
            {projections.endDate && (
              <div>
                <dt>Fecha estimada de vencimiento</dt>
                <dd>{projections.endDate}</dd>
              </div>
            )}
            <div className="guided-summary-total">
              <dt>Total a recibir</dt>
              <dd>{formatMoney(projections.total)} MXN</dd>
            </div>
          </dl>
        </WizardStep>
      );
    }

    if (currentStep === 3) {
      const numCant = Number(values.cantidad || 0);
      const isSaldoInsufficient = liquidBalance !== null && liquidBalance < numCant;

      return (
        <WizardStep
          description="Elige si deseas aplicar tu saldo disponible o registrar tu solicitud para coordinar tu aportacion."
          question="Como quieres pagar?"
        >
          {isSaldoInsufficient && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#92400e' }}>
                <span>Saldo disponible: <strong>{formatMoney(liquidBalance)}</strong>. Requiere: <strong>{formatMoney(numCant)}</strong>.</span>
              </div>
              <Button
                type="button"
                className="button-secondary"
                onClick={() => setIsDepositModalOpen(true)}
                style={{ fontSize: '0.72rem', padding: '4px 10px', minHeight: '28px' }}
              >
                + Cargar saldo
              </Button>
            </div>
          )}

          <div className="guided-choice-grid">
            {[
              {
                value: 'saldo',
                title: 'Saldo disponible',
                description: `Pagar con mi saldo (${formatMoney(liquidBalance ?? 0)})${isSaldoInsufficient ? ' — Insuficiente' : ''}`,
                disabled: isSaldoInsufficient,
              },
              {
                value: 'later',
                title: 'Definir después (En Revisión)',
                description: 'Enviar la solicitud para coordinar depósito o transferencia.',
              },
            ].map((option) => (
              <label
                className={`${values.pay_method === option.value ? 'guided-choice selected' : 'guided-choice'} ${option.disabled ? 'is-disabled' : ''}`}
                key={option.value}
                style={option.disabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                <input
                  checked={values.pay_method === option.value}
                  disabled={option.disabled}
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
          {firstFieldError(fieldErrors, 'pay_method') && (
            <p className="form-error" style={{ marginTop: '6px' }}>{firstFieldError(fieldErrors, 'pay_method')}</p>
          )}
          <dl className="guided-summary compact">
            <div>
              <dt>Resumen</dt>
              <dd>
                {getPlanName(selectedPlan)} • Inversión: {formatMoney(values.cantidad) || 'Sin monto'} • Retorno: {formatMoney(projections.total)} MXN
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
      <GuidedRequestModal
        error={error}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        stepIndex={currentStep}
        title="Solicitud de inversión"
        totalSteps={totalSteps}
        footer={(
          <>
            <Button className="button-secondary guided-action" disabled={currentStep === 0 || isSubmitting} onClick={goBack}>
              Atrás
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
        {message && <div style={{ marginBottom: '15px' }}><Alert type="success">{message}</Alert></div>}
        {renderStep()}
      </GuidedRequestModal>

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSuccess={loadLiquidBalance}
      />
    </>
  );
});

export default InvestmentRequestForm;
