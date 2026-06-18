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

function InvestmentPlanCard({ description, name, plan }) {
  const planName = formatText(name || getValue(plan, ['nombre', 'name', 'titulo', 'title', 'plan', 'tipo']), 'Plan de inversion');
  const planDescription = formatText(description || getValue(plan, ['descripcion', 'description', 'detalle', 'detalles']), 'Plan activo disponible para solicitud.');
  const rate = getValue(plan, ['porcentaje', 'porcentaje_1', 'tasa', 'rendimiento', 'interes']);

  return (
    <article className="plan-card motion-item">
      <h3>{planName}</h3>
      <p>{planDescription}</p>
      <span aria-hidden="true">{rate ? `Rendimiento ${rate}%` : 'Disponible para solicitud'}</span>
    </article>
  );
}

export default InvestmentPlanCard;
