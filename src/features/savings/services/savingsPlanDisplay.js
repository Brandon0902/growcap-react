const periodFields = ['plazo', 'periodo', 'tiempo', 'duracion', 'meses', 'dias', 'tiempo_minimo', 'frecuencia_pago'];

export function getPlanValue(plan, fields) {
  const field = fields.find((key) => plan?.[key] !== undefined && plan?.[key] !== null && plan?.[key] !== '');
  return field ? plan[field] : null;
}

export function formatPlanValue(value, fallback = 'No especificado') {
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

function formatMinimumMonths(value) {
  const months = typeof value === 'number' ? value : Number(String(value ?? '').trim());

  if (!Number.isFinite(months)) {
    return null;
  }

  return `${months} ${months === 1 ? 'mes' : 'meses'}`;
}

export function getSavingsPlanPeriod(plan) {
  const explicitPeriod = getPlanValue(plan, periodFields);

  if (explicitPeriod !== null) {
    return formatPlanValue(explicitPeriod);
  }

  return formatMinimumMonths(plan?.meses_minimos) || 'No especificado';
}