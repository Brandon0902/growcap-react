import Input from '../../../components/common/Input.jsx';
import { firstFieldError } from '../../../api/apiUtils.js';

const avalMethods = [
  {
    value: 'code',
    title: 'Tengo codigo de aval',
    description: 'Usa un codigo existente para validar al aval.',
  },
  {
    value: 'documents',
    title: 'Subire documentos del aval',
    description: 'Adjunta los archivos del aval en el siguiente paso.',
  },
];

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

function LoanStepAmount({ fieldErrors = {}, onAvalMethodChange, onChange, plans = [], values = {} }) {
  return (
    <div className="step">
      <h3>Monto del prestamo</h3>
      <p>Selecciona el plan documentado por la API e indica cuanto necesitas.</p>
      <div className="form">
        <div className="form-field">
          <label className="form-label" htmlFor="loan-plan">
            Plan de prestamo
          </label>
          <select
            className="input"
            id="loan-plan"
            name="id_activo"
            onChange={onChange}
            required
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
        <Input
          error={firstFieldError(fieldErrors, 'cantidad') || firstFieldError(fieldErrors, 'monto')}
          id="loan-amount"
          label="Monto solicitado"
          min="1"
          name="cantidad"
          onChange={onChange}
          required
          step="0.01"
          type="number"
          value={values.cantidad}
        />
        <fieldset className="aval-method-group">
          <legend>Metodo de aval</legend>
          <p>Puedes validar tu aval con un codigo existente o subir sus documentos. Solo necesitas una opcion.</p>
          <div className="aval-method-options">
            {avalMethods.map((method) => {
              const isSelected = values.avalMethod === method.value;

              return (
                <label className={isSelected ? 'aval-method-card selected' : 'aval-method-card'} key={method.value}>
                  <input
                    checked={isSelected}
                    name="avalMethod"
                    onChange={onAvalMethodChange}
                    type="radio"
                    value={method.value}
                  />
                  <span className="aval-method-dot" aria-hidden="true" />
                  <span>
                    <strong>{method.title}</strong>
                    <small>{method.description}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {values.avalMethod === 'code' && (
          <Input
            error={firstFieldError(fieldErrors, 'codigo_aval')}
            id="loan-guarantor"
            label="Codigo de aval"
            name="codigo_aval"
            onChange={onChange}
            placeholder="Captura el codigo proporcionado por tu aval"
            required
            value={values.codigo_aval}
          />
        )}
      </div>
    </div>
  );
}

export default LoanStepAmount;
