import { useState, forwardRef, useImperativeHandle } from 'react';
import { CheckCircle2, Clock, ShieldCheck, User } from 'lucide-react';
import { firstFieldError, normalizeApiError } from '../../../api/apiUtils.js';
import Alert from '../../../components/common/Alert.jsx';
import Button from '../../../components/common/Button.jsx';
import GuidedRequestModal from '../../../components/common/GuidedRequestModal.jsx';
import Input from '../../../components/common/Input.jsx';
import RequestStartCard from '../../../components/common/RequestStartCard.jsx';
import WizardStep from '../../../components/common/WizardStep.jsx';
import { guarantorDocumentFields } from '../constants/loanDocuments.js';
import { createLoanRequest, simulateLoanRequest, validateLoanAvalToken } from '../services/loanService.js';

function formatMoney(amount) {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(num);
}

const initialValues = {
  id_activo: '',
  cantidad: '',
  garantia_tipo: 'AVAL', // 'AHORRO' or 'AVAL'
  id_ahorro_garantia: '',
  codigo_aval: '',
};

const totalSteps = 5;

function getPlanId(plan) {
  return plan?.id_activo || plan?.id_prestamo || plan?.id || plan?.id_plan;
}

function getPlanName(plan) {
  if (!plan) return 'Sin plan';
  if (typeof plan === 'string' || typeof plan === 'number') return String(plan);
  const nestedPlan = plan.plan || plan.prestamo || plan.tipo;
  if (nestedPlan && typeof nestedPlan === 'object') return getPlanName(nestedPlan);
  return plan.descripcion || plan.nombre || plan.label || plan.name || `Plan #${getPlanId(plan)}`;
}

const LoanWizard = forwardRef(({ onCreated, plans = [], prerequisites = null }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [files, setFiles] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  // Aval validation state
  const [validatingToken, setValidatingToken] = useState(false);
  const [verifiedAval, setVerifiedAval] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  useImperativeHandle(ref, () => ({
    openWithPlan: (planId) => {
      setValues((current) => ({ ...current, id_activo: planId }));
      setMessage('');
      setError('');
      setFieldErrors({});
      setFiles({});
      setSimulation(null);
      setSuggestion(null);
      setVerifiedAval(null);
      setTokenError('');
      setSubmissionSuccess(null);
      setCurrentStep(1); // Skip plan selection if passed explicitly
      setIsOpen(true);
    }
  }));

  const selectedPlan = plans.find((plan) => String(getPlanId(plan)) === String(values.id_activo));
  const amountNum = Number(values.cantidad || 0);
  const isUnderTwoThousand = amountNum < 2000;

  const planMin = Number(selectedPlan?.monto_min ?? selectedPlan?.monto_minimo ?? 500);
  const planMax = Number(selectedPlan?.monto_max ?? selectedPlan?.monto_maximo ?? 0);
  const isAmountBelowMin = selectedPlan && amountNum > 0 && amountNum < planMin;
  const isAmountAboveMax = selectedPlan && planMax > 0 && amountNum > planMax;

  // Compute 30% retention capacity
  const salary = Number(prerequisites?.salarioMensual ?? 0);
  const frequency = String(prerequisites?.recurrenciaPago ?? 'Semanal');
  let periodicSalary = salary;
  if (frequency.toLowerCase().includes('semanal')) periodicSalary = salary / 4.33;
  else if (frequency.toLowerCase().includes('quincenal')) periodicSalary = salary / 2;
  const maxAllowedRetention = Number((periodicSalary * 0.30).toFixed(2));

  // Compute estimated installment
  let estimatedFee = 0;
  if (selectedPlan && amountNum > 0) {
    const planInteres = Number(selectedPlan.interes ?? 0);
    const totalAdeudo = amountNum * (1 + (planInteres / 100));
    const baseSemanas = Number(selectedPlan.semanas ?? 1);
    let numPagos = baseSemanas;
    if (frequency.toLowerCase().includes('quincenal')) numPagos = Math.max(1, Math.ceil(baseSemanas / 2));
    else if (frequency.toLowerCase().includes('mensual')) numPagos = Math.max(1, Math.ceil(baseSemanas / 4.33));
    estimatedFee = Number((totalAdeudo / numPagos).toFixed(2));
  }
  const isFeeOverLimit = salary > 0 && estimatedFee > maxAllowedRetention;

  // Eligible fixed-term savings accounts with sufficient balance
  const eligibleAhorros = (prerequisites?.ahorrosPlazo || []).filter(
    (a) => Number(a.saldo_disponible ?? 0) >= amountNum
  );

  const resetWizard = () => {
    setCurrentStep(0);
    setValues(initialValues);
    setFiles({});
    setFieldErrors({});
    setError('');
    setSimulation(null);
    setSuggestion(null);
    setVerifiedAval(null);
    setTokenError('');
    setSubmissionSuccess(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setError('');

    // If changing amount, reset verified aval if token changed
    if (name === 'cantidad') {
      const nextAmount = Number(value || 0);
      if (nextAmount >= 2000) {
        setValues((current) => ({ ...current, garantia_tipo: 'AVAL', id_ahorro_garantia: '' }));
      }
    }
  };

  const handleGarantiaTipoChange = (type) => {
    setValues((current) => ({
      ...current,
      garantia_tipo: type,
      id_ahorro_garantia: type === 'AHORRO' ? current.id_ahorro_garantia : '',
      codigo_aval: type === 'AVAL' ? current.codigo_aval : '',
    }));
    setFieldErrors((current) => ({ ...current, garantia_tipo: undefined, id_ahorro_garantia: undefined, codigo_aval: undefined }));
    setError('');
  };

  const handleValidateToken = async () => {
    if (!values.codigo_aval?.trim()) {
      setTokenError('Ingresa el código dinámico de aval primero.');
      return;
    }
    try {
      setValidatingToken(true);
      setTokenError('');
      const res = await validateLoanAvalToken(values.codigo_aval.trim());
      if (res?.valid) {
        setVerifiedAval(res);
        setFieldErrors((curr) => ({ ...curr, codigo_aval: undefined }));
      }
    } catch (err) {
      const normalized = normalizeApiError(err, 'Código de aval no válido o expirado.');
      setTokenError(normalized.message);
      setVerifiedAval(null);
    } finally {
      setValidatingToken(false);
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
      nextErrors.id_activo = 'Selecciona un plan de préstamo para continuar.';
    }

    if (stepIndex === 1) {
      if (!values.cantidad || Number(values.cantidad) <= 0) {
        nextErrors.cantidad = 'Indica el monto que necesitas solicitar.';
      } else if (planMin > 0 && amountNum < planMin) {
        nextErrors.cantidad = `El monto mínimo para el ${getPlanName(selectedPlan)} es de $${planMin.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN.`;
      } else if (planMax > 0 && amountNum > planMax) {
        nextErrors.cantidad = `El monto solicitado ($${amountNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN) excede el límite máximo del ${getPlanName(selectedPlan)} ($${planMax.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN).`;
      } else if (isFeeOverLimit) {
        nextErrors.cantidad = `La cuota periódica ($${estimatedFee.toFixed(2)}) supera tu tope del 30% ($${maxAllowedRetention.toFixed(2)}).`;
      }
    }

    if (stepIndex === 2) {
      if (isUnderTwoThousand && !values.garantia_tipo) {
        nextErrors.garantia_tipo = 'Elige un método de garantía.';
      }
    }

    if (stepIndex === 3) {
      if (isUnderTwoThousand && values.garantia_tipo === 'AHORRO') {
        if (!values.id_ahorro_garantia) {
          nextErrors.id_ahorro_garantia = 'Selecciona la cuenta de ahorro a plazo que respaldará el préstamo.';
        }
      } else if (values.garantia_tipo === 'AVAL' || !isUnderTwoThousand) {
        if (!values.codigo_aval?.trim()) {
          nextErrors.codigo_aval = 'Captura el código de aval de 48 horas.';
        } else if (!verifiedAval) {
          nextErrors.codigo_aval = 'Valida tu código de aval para verificar que esté vigente y no haya sido utilizado.';
        }
        if (!isUnderTwoThousand) {
          // Documentos obligatorios para >= $2,000 (Pagaré dual, comprobante, INE frente y reverso)
          if (!files.doc_solicitud_aval) nextErrors.doc_solicitud_aval = 'El Pagaré firmado por ambas partes es obligatorio.';
          if (!files.doc_comprobante_domicilio) nextErrors.doc_comprobante_domicilio = 'El comprobante de domicilio es obligatorio.';
          if (!files.doc_ine_frente) nextErrors.doc_ine_frente = 'La identificación frontal es obligatoria.';
          if (!files.doc_ine_reverso) nextErrors.doc_ine_reverso = 'La identificación trasera es obligatoria.';
        }
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = async () => {
    if (currentStep === 3 && (values.garantia_tipo === 'AVAL' || !isUnderTwoThousand)) {
      if (!verifiedAval) {
        if (!values.codigo_aval?.trim()) {
          setFieldErrors((curr) => ({ ...curr, codigo_aval: 'Captura el código de aval de 48 horas.' }));
          setError('Captura el código de aval de 48 horas.');
          return;
        }

        try {
          setIsSubmitting(true);
          const res = await validateLoanAvalToken(values.codigo_aval.trim());
          if (res?.valid) {
            setVerifiedAval(res);
            setFieldErrors((curr) => ({ ...curr, codigo_aval: undefined }));
            setTokenError('');
          }
        } catch (err) {
          const normalized = normalizeApiError(err, 'Código de aval no válido o ya utilizado.');
          setFieldErrors((curr) => ({ ...curr, codigo_aval: normalized.message }));
          setTokenError(normalized.message);
          setError(normalized.message);
          setIsSubmitting(false);
          return;
        } finally {
          setIsSubmitting(false);
        }
      }
    }

    if (!validateStep(currentStep)) {
      setError('Completa los campos requeridos para continuar.');
      return;
    }

    if (currentStep === 1) {
      try {
        setIsSubmitting(true);
        const sim = await simulateLoanRequest({
          plan_id: values.id_activo,
          cantidad: values.cantidad,
        });
        setSimulation(sim);
        setSuggestion(null);
        setError('');
      } catch (err) {
        const normalized = normalizeApiError(err);
        if (normalized.status === 422 && err.response?.data?.suggestion) {
          setSuggestion(err.response.data.suggestion);
          setError(err.response.data.message);
        } else {
          setError(normalized.message);
        }
        return;
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setError('');
    }

    setCurrentStep((step) => Math.min(step + 1, totalSteps - 1));
  };

  const goBack = () => {
    setError('');
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const buildLoanPayload = () => {
    const payload = {
      cantidad: Number(values.cantidad),
      id_activo: Number(values.id_activo),
      garantia_tipo: values.garantia_tipo || (isUnderTwoThousand ? 'AVAL' : 'AVAL'),
    };

    if (values.garantia_tipo === 'AHORRO') {
      payload.id_ahorro_garantia = Number(values.id_ahorro_garantia);
      return payload;
    }

    payload.codigo_aval = values.codigo_aval?.trim();

    if (!isUnderTwoThousand) {
      if (files.doc_solicitud_aval) payload.doc_solicitud_aval = files.doc_solicitud_aval;
      if (files.doc_comprobante_domicilio) payload.doc_comprobante_domicilio = files.doc_comprobante_domicilio;
      if (files.doc_ine_frente) payload.doc_ine_frente = files.doc_ine_frente;
      if (files.doc_ine_reverso) payload.doc_ine_reverso = files.doc_ine_reverso;
    }

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
      const res = await createLoanRequest(buildLoanPayload());
      const prestamoData = res?.data?.prestamo || res?.prestamo || res?.data || {};
      const successMessage = res?.data?.message || res?.message || 'Solicitud de préstamo registrada.';
      const hasAval = values.garantia_tipo === 'AVAL' || !isUnderTwoThousand;
      const cuotaFijaFinal = Number(prestamoData?.cuota_fija || estimatedFee || 0);

      setSubmissionSuccess({
        prestamo: prestamoData,
        planNombre: getPlanName(selectedPlan),
        monto: Number(values.cantidad),
        garantiaTipo: values.garantia_tipo,
        hasAval,
        avalNombre: verifiedAval?.avalNombre || null,
        cuotaEstimada: cuotaFijaFinal,
        frequency,
        isUnderTwoThousand,
        message: successMessage,
      });
      setMessage(successMessage);
      onCreated?.();
    } catch (requestError) {
      const normalized = normalizeApiError(requestError, 'No fue posible enviar la solicitud de préstamo.');
      setFieldErrors(normalized.fieldErrors || {});
      setError(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (submissionSuccess) {
      const { hasAval, prestamo, planNombre, monto, avalNombre, cuotaEstimada: cuota, frequency: freq } = submissionSuccess;
      return (
        <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              textAlign: 'center',
              padding: '24px 16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: hasAval ? '#e0e7ff' : '#dcfce7',
                color: hasAval ? '#4338ca' : '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              {hasAval ? <ShieldCheck size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              ¡Solicitud Registrada con Éxito!
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
              {hasAval
                ? 'Paso 1 de 2: En espera de confirmación de tu aval solidario'
                : 'Tu solicitud ha pasado a evaluación del comité de crédito'}
            </p>
          </div>

          <div
            style={{
              padding: '16px 20px',
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              fontSize: '0.84rem',
            }}
          >
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Folio de trámite</span>
              <strong style={{ color: '#0f172a' }}>#{prestamo?.id || 'Nuevo'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Plan</span>
              <strong style={{ color: '#0f172a' }}>{planNombre}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Monto Solicitado</span>
              <strong style={{ color: '#0f172a' }}>{formatMoney(monto)} MXN</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Cuota Fija ({freq})</span>
              <strong style={{ color: '#059669' }}>{formatMoney(cuota)}</strong>
            </div>
            {hasAval && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem' }}>Aval Asignado</span>
                <strong style={{ color: '#3730a3' }}>{avalNombre || 'Compañero asignado'}</strong>
              </div>
            )}
          </div>

          {hasAval ? (
            <div
              style={{
                padding: '14px 18px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '0.82rem',
                color: '#334155',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ display: 'block', marginBottom: '4px', color: '#0f172a' }}>
                ¿Qué sucede a continuación? (Aprobación en 2 Pasos)
              </strong>
              Hemos enviado la solicitud a <strong>{avalNombre || 'tu aval'}</strong> con el desglose de montos y cuotas. Tu compañero debe ingresar a su portal de GrowCap o revisar su correo y autorizar formalmente el respaldo con su NIP de seguridad. Una vez que tu aval lo apruebe, tu trámite pasará a revisión del comité de crédito.
            </div>
          ) : (
            <div
              style={{
                padding: '14px 18px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                fontSize: '0.82rem',
                color: '#166534',
                lineHeight: 1.5,
              }}
            >
              Tu solicitud está respaldada por tu ahorro en garantía y ya se encuentra en evaluación por la administración de la caja.
            </div>
          )}

          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', textAlign: 'center' }}>
            Puedes dar seguimiento en tiempo real al estado de tu trámite o cancelarlo si deseas cambiar condiciones desde tu sección de Préstamos.
          </p>
        </div>
      );
    }

    // Paso 0: Selección de Plan
    if (currentStep === 0) {
      return (
        <WizardStep
          description="Elige el producto de préstamo que mejor se adapta a tu proyecto y capacidad."
          question="¿Qué plan de préstamo deseas solicitar?"
        >
          {prerequisites?.hasActiveLoan && (
            <div style={{ marginBottom: '16px' }}>
              <Alert type="error">
                Ya cuentas con un préstamo activo o en revisión. Por política de seguridad, debes liquidarlo antes de solicitar uno nuevo.
              </Alert>
            </div>
          )}

          <div className="form-field">
            <label className="form-label" htmlFor="loan-plan">
              Plan de préstamo
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
                const isLocked = plan.lock_reasons && plan.lock_reasons.length > 0;
                return (
                  <option key={id || index} value={id || ''} disabled={isLocked}>
                    {getPlanName(plan)} {isLocked ? `(Bloqueado: ${plan.lock_reasons[0]})` : ''}
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

    // Paso 1: Monto y Capacidad de Nómina
    if (currentStep === 1) {
      return (
        <WizardStep
          description="Escribe la cantidad que necesitas. Calculamos tu cuota fija y verificamos tu tope del 30% de nómina."
          question="¿Cuánto necesitas solicitar?"
        >
          <Input
            error={firstFieldError(fieldErrors, 'cantidad') || firstFieldError(fieldErrors, 'monto')}
            id="loan-amount"
            label="Monto solicitado (MXN)"
            min={planMin || 500}
            max={planMax > 0 ? planMax : undefined}
            name="cantidad"
            onChange={handleChange}
            step="100"
            type="number"
            value={values.cantidad}
          />

          {selectedPlan && (
            <div style={{ marginTop: '6px', marginBottom: '12px', fontSize: '0.84rem', color: '#64748b' }}>
              <span>Límite del {getPlanName(selectedPlan)}: </span>
              <strong>${planMin.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              {planMax > 0 ? (
                <> a <strong>${planMax.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong></>
              ) : (
                ' MXN en adelante'
              )}
            </div>
          )}

          {amountNum > 0 && selectedPlan && (
            <div style={{ marginTop: '14px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              {isAmountAboveMax && (
                <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '12px' }}>
                  🚫 El monto ingresado (${amountNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN) supera el tope máximo de <strong>${planMax.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong> para el {getPlanName(selectedPlan)}. Ajusta la cantidad o elige un plan con mayor capacidad.
                </div>
              )}

              {isAmountBelowMin && (
                <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem', marginBottom: '12px' }}>
                  🚫 El monto ingresado (${amountNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN) es menor al mínimo de <strong>${planMin.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong> para el {getPlanName(selectedPlan)}.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                <span style={{ color: '#64748b' }}>Frecuencia de descuento ({frequency}):</span>
                <strong style={{ color: '#0f172a' }}>${estimatedFee.toFixed(2)} / pago</strong>
              </div>

              {salary > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Tope de descuento ({frequency}) permitido:</span>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>${maxAllowedRetention.toFixed(2)} MXN</span>
                </div>
              )}

              {isFeeOverLimit ? (
                <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                  ⚠️ La cuota estimada supera el 30% permitido de tu salario de nómina (${maxAllowedRetention.toFixed(2)}). Reduce el monto o solicita un plan con mayor plazo.
                </div>
              ) : !isAmountAboveMax && !isAmountBelowMin ? (
                <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.85rem' }}>
                  ✓ Cuota y monto dentro de tu capacidad y límites autorizados del plan.
                </div>
              ) : null}

              <div style={{ marginTop: '12px', fontSize: '0.82rem', color: isUnderTwoThousand ? '#2563eb' : '#d97706' }}>
                {isUnderTwoThousand
                  ? '✨ Préstamo menor a $2,000.00 MXN: Trámite 100% digital sin papeleo físico (Auto-Garantía con Ahorro o Aval con Código Dinámico).'
                  : '🛡️ Préstamo a partir de $2,000.00 MXN: Requiere Garantía Reforzada (Código Dinámico de Aval + Pagaré con ambas firmas y documentos).'}
              </div>
            </div>
          )}

          {suggestion && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 6px', color: '#1e3a8a' }}>Plan Recomendado</h4>
              <p style={{ margin: '0 0 10px', fontSize: '0.88rem', color: '#1e40af' }}>
                La cuota fija para tu capacidad sería de ${suggestion.cuota_fija.toFixed(2)}.
              </p>
              <Button
                onClick={() => {
                  setValues((curr) => ({ ...curr, id_activo: suggestion.plan_id }));
                  setSuggestion(null);
                  setError('');
                }}
              >
                Aplicar Plan Recomendado
              </Button>
            </div>
          )}
        </WizardStep>
      );
    }

    // Paso 2: Esquema de Garantía según Umbral de $2,000
    if (currentStep === 2) {
      if (isUnderTwoThousand) {
        return (
          <WizardStep
            description="Para montos menores a $2,000.00 MXN, puedes elegir respaldar tu préstamo con tu ahorro a plazo o con el código dinámico de un aval."
            question="¿Cómo deseas respaldar tu préstamo?"
          >
            <div className="guided-choice-grid">
              <label
                className={values.garantia_tipo === 'AHORRO' ? 'guided-choice selected' : 'guided-choice'}
                style={{ opacity: eligibleAhorros.length === 0 ? 0.7 : 1 }}
              >
                <input
                  checked={values.garantia_tipo === 'AHORRO'}
                  name="garantia_tipo"
                  onChange={() => handleGarantiaTipoChange('AHORRO')}
                  type="radio"
                  value="AHORRO"
                />
                <strong>🏦 Opción A: Auto-Garantía con Ahorro a Plazo</strong>
                <span>
                  Sin avales ni papeleo. Tu saldo en ahorro a plazo respaldará el préstamo y quedará retenido hasta liquidarlo.
                </span>
                <span style={{ fontSize: '0.78rem', color: eligibleAhorros.length > 0 ? '#166534' : '#b91c1c', marginTop: '6px' }}>
                  {eligibleAhorros.length > 0
                    ? `✓ Tienes ${eligibleAhorros.length} cuenta(s) a plazo con saldo disponible $\\ge$ $${amountNum.toFixed(2)}.`
                    : 'No tienes cuentas de ahorro a plazo con saldo suficiente para auto-garantía.'}
                </span>
              </label>

              <label className={values.garantia_tipo === 'AVAL' ? 'guided-choice selected' : 'guided-choice'}>
                <input
                  checked={values.garantia_tipo === 'AVAL'}
                  name="garantia_tipo"
                  onChange={() => handleGarantiaTipoChange('AVAL')}
                  type="radio"
                  value="AVAL"
                />
                <strong>🛡️ Opción B: Aval Solidario (Aprobación en 2 Pasos)</strong>
                <span>
                  Ingresa el código dinámico de 48 horas generado por tu aval. Tu compañero recibirá la solicitud en su portal y correo, y deberá autorizarla con su NIP antes de que pase a dictamen del comité.
                </span>
                <span style={{ fontSize: '0.76rem', color: '#4338ca', fontWeight: 600, marginTop: '6px' }}>
                  ✓ Sin papeleo físico. Respaldo formal y seguro con consentimiento digital.
                </span>
              </label>
            </div>
            {firstFieldError(fieldErrors, 'garantia_tipo') && (
              <p className="form-error">{firstFieldError(fieldErrors, 'garantia_tipo')}</p>
            )}
          </WizardStep>
        );
      }

      // Si es >= 2,000 MXN: Opción C Obligatoria
      return (
        <WizardStep
          description="Para préstamos a partir de $2,000.00 MXN, la normativa requiere Garantía Reforzada y Aprobación en Dos Pasos."
          question="Opción C: Garantía Reforzada con Aval Solidario"
        >
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.4rem' }}>🛡️</span>
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>Protocolo y Requisitos de Garantía</h4>
            </div>
            <ul style={{ margin: '0 0 14px', paddingLeft: '20px', fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
              <li>
                <strong>Código Dinámico de Aval:</strong> Tu compañero debe generar su código de 48 horas desde su portal.
              </li>
              <li>
                <strong>Aprobación Digital (Paso 1):</strong> Al registrar la solicitud, tu aval recibirá la notificación para autorizar el respaldo con su NIP de seguridad.
              </li>
              <li>
                <strong>Pagaré Oficial Firmado:</strong> Documento firmado por <strong>ambas partes</strong> (solicitante y aval).
              </li>
              <li>
                <strong>Expediente Oficial:</strong> Comprobante de domicilio vigente e identificación oficial por ambos lados.
              </li>
            </ul>
            <div style={{ fontSize: '0.82rem', color: '#059669', background: '#ecfdf5', padding: '8px 12px', borderRadius: '8px' }}>
              ✓ En el siguiente paso capturarás el código y cargarás los documentos requeridos.
            </div>
          </div>
        </WizardStep>
      );
    }

    // Paso 3: Captura de Garantía y Documentación
    if (currentStep === 3) {
      if (isUnderTwoThousand && values.garantia_tipo === 'AHORRO') {
        return (
          <WizardStep
            description="Selecciona la cuenta de ahorro a plazo que quedará en garantía hasta la liquidación de tu préstamo."
            question="Selecciona tu cuenta de ahorro a plazo"
          >
            <div className="form-field">
              <label className="form-label" htmlFor="ahorro-garantia">
                Cuenta de ahorro a plazo
              </label>
              <select
                className="input"
                id="ahorro-garantia"
                name="id_ahorro_garantia"
                onChange={handleChange}
                value={values.id_ahorro_garantia}
              >
                <option value="">Selecciona una cuenta</option>
                {eligibleAhorros.map((a) => (
                  <option key={a.id} value={a.id}>
                    Ahorro #{a.id} ({a.plan_nombre || a.tipo_ahorro}) — Saldo disponible: ${Number(a.saldo_disponible).toFixed(2)} MXN
                  </option>
                ))}
              </select>
              {firstFieldError(fieldErrors, 'id_ahorro_garantia') && (
                <p className="form-error">{firstFieldError(fieldErrors, 'id_ahorro_garantia')}</p>
              )}
            </div>

            <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.85rem', color: '#166534' }}>
              🔒 <strong>Compromiso de garantía:</strong> Al autorizarse tu préstamo, se retendrán en garantía $
              {amountNum.toFixed(2)} MXN de esta cuenta. Podrás disponer de tu ahorro una vez liquidado el adeudo.
            </div>
          </WizardStep>
        );
      }

      // Aval Digital (Menor a 2,000 o Mayor a 2,000)
      return (
        <WizardStep
          description={
            isUnderTwoThousand
              ? 'Captura el código dinámico de 48 horas generado por tu aval.'
              : 'Captura el código dinámico de tu aval y adjunta el pagaré con ambas firmas y tu documentación.'
          }
          question={isUnderTwoThousand ? 'Validación de Código de Aval' : 'Validación de Aval y Documentación'}
        >
          <div className="form-field" style={{ marginBottom: '16px' }}>
            <label className="form-label" htmlFor="loan-guarantor">
              Código de Aval (Vigencia 48h)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                error={firstFieldError(fieldErrors, 'codigo_aval')}
                id="loan-guarantor"
                name="codigo_aval"
                onChange={(e) => {
                  handleChange(e);
                  setVerifiedAval(null);
                  setTokenError('');
                }}
                placeholder="Ej. AVL-47PGD7"
                value={values.codigo_aval}
              />
              <Button
                disabled={validatingToken || !values.codigo_aval?.trim()}
                onClick={handleValidateToken}
                style={{ alignSelf: 'flex-start', minHeight: '42px', padding: '0 16px', whiteSpace: 'nowrap' }}
              >
                {validatingToken ? 'Verificando...' : 'Validar'}
              </Button>
            </div>

            {tokenError && (
              <p className="form-error" style={{ marginTop: '6px' }}>
                {tokenError}
              </p>
            )}

            {verifiedAval && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 600, fontSize: '0.88rem' }}>
                  <CheckCircle2 size={18} />
                  <span>Aval verificado: {verifiedAval.avalNombre}</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#166534', lineHeight: 1.4 }}>
                  Al enviar la solicitud, <strong>{verifiedAval.avalNombre}</strong> recibirá una notificación en su portal de GrowCap y por correo para autorizar formalmente este crédito con su NIP de seguridad (Paso 1 de 2).
                </p>
              </div>
            )}
          </div>

          {!isUnderTwoThousand && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#0f172a' }}>
                Documentación Obligatoria (Préstamos mayores a $2,000 MXN)
              </h4>
              <div className="guided-file-grid">
                {guarantorDocumentFields.map((field) => (
                  <div className="form-field" key={field.id}>
                    <label className="form-label" htmlFor={field.id}>
                      {field.id === 'doc_solicitud_aval'
                        ? 'Pagaré Oficial Firmado por Solicitante y Aval'
                        : field.label}
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
            </div>
          )}
        </WizardStep>
      );
    }

    // Paso 4: Confirmación y Amortización
    return (
      <WizardStep
        description="Revisa el resumen financiero de tu préstamo y la tabla de amortización antes de enviar."
        question="Confirmación de solicitud"
      >
        <dl className="guided-summary" style={{ marginBottom: '16px' }}>
          <div>
            <dt>Plan seleccionado</dt>
            <dd>{getPlanName(selectedPlan)}</dd>
          </div>
          <div>
            <dt>Monto solicitado</dt>
            <dd>${Number(values.cantidad || 0).toFixed(2)} MXN</dd>
          </div>
          <div>
            <dt>Esquema de garantía</dt>
            <dd>
              {isUnderTwoThousand && values.garantia_tipo === 'AHORRO'
                ? `Auto-Garantía con Ahorro #${values.id_ahorro_garantia}`
                : `Aval Digital (${values.codigo_aval || 'Pendiente'})`}
            </dd>
          </div>
          {verifiedAval && (
            <div>
              <dt>Aval registrado</dt>
              <dd>{verifiedAval.avalNombre}</dd>
            </div>
          )}
          {!isUnderTwoThousand && (
            <div>
              <dt>Expediente</dt>
              <dd>{guarantorDocumentFields.filter((f) => files[f.id]).length} documentos adjuntos</dd>
            </div>
          )}
        </dl>

        {simulation && simulation.desglose && (
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#0f172a' }}>
              Tabla de Amortización Proyectada ({simulation.frecuencia_pago || frequency})
            </h4>
            <div style={{ overflowX: 'auto', maxHeight: '200px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>No.</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Fecha</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Cuota</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Capital</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Interés</th>
                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.desglose.map((p) => (
                    <tr key={p.numero_pago}>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>{p.numero_pago}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{p.fecha_pago}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: '600' }}>
                        ${Number(p.cuota).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        ${Number(p.capital).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        ${Number(p.interes).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                        ${Number(p.saldo_restante).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span>
                Total Intereses: <strong>${Number(simulation.total_interes ?? 0).toFixed(2)}</strong>
              </span>
              <span>
                Total a Pagar: <strong>${Number(simulation.total_a_pagar ?? 0).toFixed(2)}</strong>
              </span>
            </div>
          </div>
        )}

        {(values.garantia_tipo === 'AVAL' || !isUnderTwoThousand) && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 18px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
            }}
          >
            <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
              Protocolo de Aprobación en Dos Pasos (Double Opt-in)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span
                  style={{
                    background: '#e0e7ff',
                    color: '#3730a3',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  1
                </span>
                <span>
                  <strong>Autorización de tu aval ({verifiedAval?.avalNombre || 'Compañero asignado'}):</strong> Tu compañero recibirá los detalles en su buzón de GrowCap y correo, y confirmará con su NIP de seguridad.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#64748b',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  2
                </span>
                <span>
                  <strong>Dictamen del comité de crédito:</strong> Al contar con el respaldo confirmado de tu aval, la administración evaluará tu crédito para su aprobación final.
                </span>
              </div>
            </div>
          </div>
        )}
      </WizardStep>
    );
  };

  return (
    <>
      <RequestStartCard
        disabled={plans.length === 0}
        onStart={() => {
          resetWizard();
          setMessage('');
          setIsOpen(true);
        }}
        title="Solicitar préstamo"
      >
        {message && <Alert type="success">{message}</Alert>}
      </RequestStartCard>

      <GuidedRequestModal
        error={error}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          if (submissionSuccess) resetWizard();
        }}
        stepIndex={submissionSuccess ? totalSteps : currentStep}
        title={submissionSuccess ? 'Confirmación de Solicitud' : 'Solicitud de préstamo'}
        totalSteps={totalSteps}
        footer={
          submissionSuccess ? (
            <Button
              className="guided-action"
              style={{ width: '100%' }}
              onClick={() => {
                setIsOpen(false);
                resetWizard();
              }}
            >
              Entendido, ver mis préstamos
            </Button>
          ) : (
            <>
              <Button className="button-secondary guided-action" disabled={currentStep === 0 || isSubmitting} onClick={goBack}>
                Atrás
              </Button>
              {currentStep === totalSteps - 1 ? (
                <Button className="guided-action" disabled={isSubmitting} onClick={submitRequest}>
                  {isSubmitting
                    ? 'Enviando...'
                    : (values.garantia_tipo === 'AVAL' || !isUnderTwoThousand)
                    ? 'Enviar y solicitar autorización al aval'
                    : 'Enviar solicitud'}
                </Button>
              ) : (
                <Button
                  className="guided-action"
                  disabled={(currentStep === 1 && (isFeeOverLimit || isAmountAboveMax || isAmountBelowMin || amountNum <= 0)) || isSubmitting}
                  onClick={goNext}
                >
                  Siguiente
                </Button>
              )}
            </>
          )
        }
      >
        {renderStep()}
      </GuidedRequestModal>
    </>
  );
});

export default LoanWizard;
