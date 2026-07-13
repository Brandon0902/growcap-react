import { ChartNoAxesColumnIncreasing } from 'lucide-react';

function getValue(item, fields) {
  const field = fields.find((key) => item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '');
  return field ? item[field] : null;
}

function formatText(value, fallback = 'No definido') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  if (typeof value === 'object') {
    const readableValue = [value.nombre, value.label, value.name, value.titulo, value.title, value.tipo]
      .map((candidate) => formatText(candidate, ''))
      .find(Boolean);

    return readableValue || (value.id !== undefined ? `Plan #${value.id}` : fallback);
  }

  return fallback;
}

function getNumericValue(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    return getNumericValue(value.monto_min ?? value.monto ?? value.rendimiento ?? value.porcentaje ?? value.cantidad);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/[$,%\s]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value) {
  const numeric = getNumericValue(value);

  if (numeric === null) {
    return formatText(value);
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
    return formatText(value);
  }

  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(numeric)}%`;
}

function formatStatus(value) {
  if (typeof value === 'boolean') {
    return value ? 'Activo' : 'Inactivo';
  }

  if (value === 1 || value === '1') {
    return 'Activo';
  }

  if (value === 0 || value === '0') {
    return 'Inactivo';
  }

  return formatText(value);
}

function InvestmentPlanCard({ description, name, plan }) {
  const planName = formatText(name || getValue(plan, ['nombre', 'name', 'titulo', 'title', 'plan', 'tipo']), 'Plan de inversion');
  const planDescription = formatText(description || getValue(plan, ['descripcion', 'description', 'detalle', 'detalles']), 'Plan activo disponible para solicitud.');
  const rate = getValue(plan, ['porcentaje', 'porcentaje_1', 'tasa', 'rendimiento', 'interes']);
  const amount = getValue(plan, ['monto_minimo', 'monto_min', 'capital_minimo', 'inversion_minima', 'monto', 'capital']);
  const term = getValue(plan, ['plazo', 'periodo', 'tiempo', 'duracion', 'meses']);
  const status = getValue(plan, ['estado', 'estatus', 'status', 'activo', 'active']);

  return (
    <article className="savings-plan-card motion-item motion-plan-card" tabIndex={0}>
      <div className="savings-plan-card-top">
        <span className="savings-plan-icon investment-plan-icon" aria-hidden="true">
          <ChartNoAxesColumnIncreasing size={22} />
        </span>
        <div>
          <h3>{planName}</h3>
          <p>{planDescription}</p>
        </div>
      </div>

      <div className="savings-plan-rate">
        <span>Rendimiento</span>
        <strong>{rate !== null ? formatPercent(rate) : 'No definido'}</strong>
      </div>

      <div className="savings-plan-summary">
        <span>
          <small>Inversion minima</small>
          <strong>{amount !== null ? formatAmount(amount) : 'No definido'}</strong>
        </span>
        <span>
          <small>{term !== null ? 'Plazo' : 'Estado'}</small>
          <strong>{term !== null ? formatText(term) : formatStatus(status)}</strong>
        </span>
      </div>
    </article>
  );
}

export default InvestmentPlanCard;
