import { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  extractCheckoutUrl,
  extractResourceId,
  firstFieldError,
  normalizeApiError,
} from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import GuidedRequestModal from '../../../components/common/GuidedRequestModal.jsx';
import WizardStep from '../../../components/common/WizardStep.jsx';
import { createSavingsCheckout, createSavingsRequest } from '../services/savingsService.js';
import { buildSavingsCheckoutPayload, buildSavingsRequestPayload, formatSavingsRequestError } from '../services/savingsRequest.js';
import { getSavingsPlanPeriod } from '../services/savingsPlanDisplay.js';

const initialValues = {
  ahorro_id: '',
  cuota: '',
  fecha_fin: '',
  monto_inicial: '',
  payment_method: 'stripe',
};

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

function formatExpirationDate(date) {
  if (!date) return 'Sin fecha fija';
  if (date instanceof Date) {
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const str = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    return localDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const parsed = new Date(str.replace(' ', 'T'));
  if (isNaN(parsed.getTime())) return str;
  return parsed.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getPlanExpirationDate(selectedPlan, values) {
  if (!selectedPlan) return 'No especificado';

  // 1. Si el usuario definió una fecha personalizada (ej. Meta Libre)
  if (values?.fecha_fin) {
    return formatExpirationDate(values.fecha_fin);
  }

  // 2. Si el plan tiene mes_corte y dia_corte fijados (ej. Verano, Meta Navideña)
  const mesCorte = Number(selectedPlan.mes_corte ?? selectedPlan.plan_mes_corte);
  const diaCorte = Number(selectedPlan.dia_corte ?? selectedPlan.plan_dia_corte ?? 1);

  if (mesCorte && diaCorte) {
    const start = new Date();
    let targetYear = start.getFullYear();
    const targetMonth = mesCorte - 1; // 0-indexed en JS
    const currentYearTarget = new Date(targetYear, targetMonth, diaCorte);
    if (currentYearTarget <= start) {
      targetYear += 1;
    }
    const targetDate = new Date(targetYear, targetMonth, diaCorte);
    return formatExpirationDate(targetDate);
  }

  // 3. Si el plan tiene meses_minimos definidos (ej. 12 meses)
  const mesesMinimos = Number(selectedPlan.meses_minimos ?? 0);
  if (mesesMinimos > 0) {
    const start = new Date();
    start.setMonth(start.getMonth() + mesesMinimos);
    return formatExpirationDate(start);
  }

  // 4. Si es plan sin plazo forzoso (ej. Siempre disponible)
  return 'Disponible en cualquier momento (Retiro libre)';
}

const SavingsRequestForm = forwardRef(({ plans = [], suggestedFrequency, salaryCapacity }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useImperativeHandle(ref, () => ({
    openWithPlan: (planId, initialCuota = null) => {
      const targetPlan = plans.find((p) => String(getPlanId(p)) === String(planId));
      if (targetPlan && (Number(targetPlan?.status) === 0 || targetPlan?.status === false)) {
        return;
      }
      setValues((current) => ({
        ...current,
        ahorro_id: planId,
        ...(initialCuota ? { cuota: String(initialCuota) } : {}),
      }));
      setMessage('');
      setError('');
      setFieldErrors({});
      setCurrentStep(1); // Skip plan selection step
      setIsOpen(true);
    },
  }));

  const selectedPlan = plans.find((plan) => String(getPlanId(plan)) === String(values.ahorro_id));
  const isCustomDatePlan = Boolean(selectedPlan?.permite_fecha_personalizada || selectedPlan?.es_escalonado);
  const isSeasonal = isCustomDatePlan;
  const planYield = getPlanValue(selectedPlan, percentFields);
  const planPeriod = getSavingsPlanPeriod(selectedPlan);
  const minFee = getNumericValue(getPlanValue(selectedPlan, minFeeFields));
  const feeAmount = Number(values.cuota || 0);
  const initialAmount = Number(values.monto_inicial || 0);
  const totalNow = feeAmount + initialAmount;
  const dateEndStep = 2;
  const summaryStep = isSeasonal ? 3 : 2;
  const totalSteps = summaryStep + 1;

  const customPlanCalculation = useMemo(() => {
    if (!isCustomDatePlan) return null;

    const minMonths = Number(selectedPlan?.meses_minimos || 2);
    const tasaMin = Number(selectedPlan?.tasa_min ?? 7.5);
    const tasaMax = Number(selectedPlan?.tasa_max ?? 12.5);

    if (!values.fecha_fin) {
      return {
        assignedRate: tasaMin,
        totalMonths: 0,
        gamification: null,
        rateDisplay: `${tasaMin}% - ${tasaMax}% anual`,
        periodDisplay: `Personalizado (mínimo ${minMonths} meses)`,
      };
    }

    const start = new Date();
    const end = new Date(values.fecha_fin + 'T00:00:00');
    if (isNaN(end.getTime())) {
      return {
        assignedRate: tasaMin,
        totalMonths: 0,
        gamification: null,
        rateDisplay: `${tasaMin}% - ${tasaMax}% anual`,
        periodDisplay: `Personalizado (mínimo ${minMonths} meses)`,
      };
    }

    const totalMonths = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));

    let assignedRate = 7.5;
    let gamification = null;

    if (totalMonths >= 24) {
      assignedRate = 12.5;
      gamification = '🏆 ¡Felicidades! Alcanzaste el plazo multianual con la máxima tasa de 12.5% anual.';
    } else if (totalMonths >= 12) {
      assignedRate = 11.5;
      gamification = '💡 Llega a 24 meses para subir tu tasa a 12.5% (+1.0%)';
    } else if (totalMonths >= 6) {
      assignedRate = 9.5;
      gamification = '💡 Llega a 12 meses para subir tu tasa a 11.5% (+2.0%)';
    } else {
      assignedRate = 7.5;
      gamification = '💡 Llega a 6 meses para subir tu tasa a 9.5% (+2.0%)';
    }

    return {
      assignedRate,
      totalMonths,
      gamification,
      rateDisplay: `${assignedRate.toFixed(1)}% anual`,
      periodDisplay: `${totalMonths} meses (hasta ${values.fecha_fin})`,
    };
  }, [isCustomDatePlan, selectedPlan, values.fecha_fin]);

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

    if (stepIndex === 0 && !values.ahorro_id) {
      nextErrors.ahorro_id = 'Selecciona un plan para continuar.';
    }

    if (stepIndex === 1 && (!values.cuota || !Number.isFinite(parsedFee) || parsedFee <= 0)) {
      nextErrors.cuota = 'Indica la cuota que quieres pagar.';
    }

    if (stepIndex === 1 && minFee !== null && Number.isFinite(parsedFee) && parsedFee < minFee) {
      nextErrors.cuota = 'La cuota debe ser mayor o igual al minimo del plan.';
    }

    if (stepIndex === 1 && salaryCapacity && Number.isFinite(salaryCapacity.capacidad_disponible) && salaryCapacity.capacidad_disponible > 0) {
      if (parsedFee > salaryCapacity.capacidad_disponible) {
        nextErrors.cuota = `La cuota (${formatMoney(parsedFee)}) excede tu capacidad de ahorro disponible de ${formatMoney(salaryCapacity.capacidad_disponible)} (máximo 50% de tu salario por periodo).`;
      }
    }

    if (isSeasonal && stepIndex === dateEndStep) {
      if (!values.fecha_fin) {
        nextErrors.fecha_fin = 'Indica el día en el que deseas que se liquide tu ahorro.';
      } else {
        const minMonths = Number(selectedPlan?.meses_minimos || 0);
        if (minMonths > 0) {
          const selectedDate = new Date(values.fecha_fin + 'T00:00:00');
          const now = new Date();
          const totalMonths = (selectedDate.getFullYear() - now.getFullYear()) * 12 + (selectedDate.getMonth() - now.getMonth());

          if (totalMonths < minMonths) {
            nextErrors.fecha_fin = `El plazo mínimo para este plan es de ${minMonths} meses.`;
          }
        }
      }
    }
    
    if (stepIndex === summaryStep && !values.aceptado) {
      nextErrors.aceptado = 'Debes aceptar las condiciones para enviar la solicitud.';
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

      const savingsId = extractResourceId(created, ['id', 'id_ahorro', 'ahorro_id']);

      if (!savingsId) {
        throw new Error('No se pudo confirmar la creación del ahorro en la base de datos.');
      }

      setMessage(created.message || '¡Solicitud creada! El descuento se procesará automáticamente en tu próxima nómina.');
      
      // We call onCreated to refresh the list of active savings
      if (typeof onCreated === 'function') {
        onCreated(created);
      }
      
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitting(false);
      }, 3000);

    } catch (requestError) {
      const normalized = normalizeApiError(requestError, 'No fue posible enviar la solicitud de ahorro.');
      setFieldErrors(normalized.fieldErrors);
      setError(formatSavingsRequestError(requestStage, normalized.message));
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
        <span>Fecha de vencimiento</span>
        <strong>{getPlanExpirationDate(selectedPlan, values)}</strong>
      </div>
      <div>
        <span>Rendimiento</span>
        <strong>{customPlanCalculation ? customPlanCalculation.rateDisplay : formatPercent(planYield)}</strong>
      </div>
      <div>
        <span>Cuota minima</span>
        <strong>{minFee !== null ? formatMoney(minFee) : 'No especificado'}</strong>
      </div>
    </div>
  );

  const renderSummary = () => (
    <>
      <dl className="guided-summary">
        <div>
          <dt>Plan seleccionado</dt>
          <dd>{getPlanName(selectedPlan)}</dd>
        </div>
        <div>
          <dt>Fecha de vencimiento del plan</dt>
          <dd style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
            {getPlanExpirationDate(selectedPlan, values)}
          </dd>
        </div>
        <div>
          <dt>Rendimiento anual</dt>
          <dd>
            {customPlanCalculation && values.fecha_fin
              ? customPlanCalculation.rateDisplay
              : formatPercent(planYield)}
          </dd>
        </div>
        <div className="guided-summary-total">
          <dt>Monto a procesar</dt>
          <dd>{formatMoney(totalNow)}</dd>
        </div>
      </dl>
      
      <div
        className="form-field checkbox-field"
        style={{
          marginTop: '16px',
          padding: '12px 14px',
          background: 'rgba(107, 33, 168, 0.04)',
          border: '1px solid #e9d5ff',
          borderRadius: '10px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}
      >
        <input 
          type="checkbox" 
          id="accept-terms" 
          name="aceptado"
          checked={!!values.aceptado}
          onChange={(e) => setValues(curr => ({ ...curr, aceptado: e.target.checked }))}
          style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
        />
        <label htmlFor="accept-terms" style={{ cursor: 'pointer', fontSize: '0.84rem', color: 'var(--purple-950)', margin: 0, lineHeight: '1.4' }}>
          <strong>Autorizo el descuento</strong> periódico vía nómina conforme a las condiciones de este plan.
        </label>
      </div>
      {fieldErrors.aceptado && (
        <p className="form-error" style={{ marginTop: '5px' }}>{fieldErrors.aceptado}</p>
      )}
    </>
  );

  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <WizardStep
          description="Selecciona el tipo de ahorro que deseas iniciar."
          question="Selecciona tu plan"
        >
          <div className="form-field" style={{ marginBottom: '10px' }}>
            <select
              className="input"
              id="savings-plan"
              name="ahorro_id"
              onChange={handleChange}
              value={values.ahorro_id}
              style={{ fontSize: '0.96rem', fontWeight: 600, padding: '10px 14px' }}
            >
              <option value="">Selecciona un plan</option>
              {plans.map((plan, index) => {
                const id = getPlanId(plan);
                const isInactive = Number(plan?.status) === 0 || plan?.status === false;

                return (
                  <option key={id || index} value={id || ''} disabled={isInactive}>
                    {getPlanName(plan)}{isInactive ? ' (No disponible)' : ''}
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
          description="Descuento automático vía nómina."
          question="¿Cuánto deseas aportar?"
        >
          <div className="hero-amount-field">
            <div className={`hero-amount-box ${firstFieldError(fieldErrors, 'cuota') ? 'has-error' : ''}`}>
              <span className="hero-amount-currency" aria-hidden="true">$</span>
              <input
                autoFocus
                className="hero-amount-input"
                id="savings-fee"
                inputMode="decimal"
                max={salaryCapacity?.capacidad_disponible > 0 ? salaryCapacity.capacidad_disponible : undefined}
                min={minFee ?? 1}
                name="cuota"
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={values.cuota}
              />
              <span className="hero-amount-suffix" aria-hidden="true">MXN</span>
            </div>
            {firstFieldError(fieldErrors, 'cuota') && (
              <p className="form-error" style={{ margin: '2px 0 0' }}>{firstFieldError(fieldErrors, 'cuota')}</p>
            )}
            <div className="hero-amount-badge-row">
              <span style={{ color: '#64748b' }}>
                Mínimo del plan: <strong style={{ color: '#334155' }}>{minFee !== null ? formatMoney(minFee) : '$100.00'}</strong>
              </span>
              {salaryCapacity && salaryCapacity.salario_periodico > 0 && (
                <span style={{ color: '#64748b' }}>
                  Disponible (máx 50% nómina):{' '}
                  <strong style={{ color: salaryCapacity.capacidad_disponible > 0 ? '#16a34a' : '#dc2626' }}>
                    {formatMoney(salaryCapacity.capacidad_disponible)}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </WizardStep>
      );
    }

    if (isSeasonal && currentStep === dateEndStep) {
      const minMonths = Number(selectedPlan?.meses_minimos || 0);
      const minDateObj = new Date();
      if (minMonths > 0) minDateObj.setMonth(minDateObj.getMonth() + minMonths);
      const minDateString = `${minDateObj.getFullYear()}-${String(minDateObj.getMonth() + 1).padStart(2, '0')}-${String(minDateObj.getDate()).padStart(2, '0')}`;

      return (
        <WizardStep
          description="Día en que se liquidará tu ahorro y rendimientos."
          question="¿Cuándo deseas recibir tu ahorro?"
        >
          <div className="hero-amount-field">
            <div className={`hero-date-box ${firstFieldError(fieldErrors, 'fecha_fin') ? 'has-error' : ''}`}>
              <input
                className="hero-date-input"
                id="savings-end-date"
                min={minDateString}
                name="fecha_fin"
                onChange={handleChange}
                type="date"
                value={values.fecha_fin}
              />
            </div>
            {firstFieldError(fieldErrors, 'fecha_fin') && (
              <p className="form-error" style={{ margin: '2px 0 0' }}>{firstFieldError(fieldErrors, 'fecha_fin')}</p>
            )}
            {customPlanCalculation && customPlanCalculation.totalMonths > 0 && (
              <div className="hero-amount-badge-row" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <span style={{ color: '#166534', fontWeight: 600 }}>
                  Tasa asignada: {customPlanCalculation.assignedRate}% anual
                </span>
                <span style={{ color: '#166534', fontWeight: 600 }}>
                  Plazo: {customPlanCalculation.totalMonths} meses
                </span>
              </div>
            )}
          </div>
        </WizardStep>
      );
    }

    if (currentStep === summaryStep) {
      return (
        <WizardStep
          description="Revisa los datos antes de enviar tu solicitud."
          question="Confirmación"
        >
          {renderSummary()}
        </WizardStep>
      );
    }

    return null;
  };

  return (
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
        {message && <div style={{ marginBottom: '15px' }}><Alert type="success">{message}</Alert></div>}
        {renderStep()}
      </GuidedRequestModal>
  );
});

export default SavingsRequestForm;
