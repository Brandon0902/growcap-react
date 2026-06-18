function LoanStepConfirmation({ plans = [], values = {} }) {
  const selectedPlan = plans.find((plan) => String(plan?.id_activo || plan?.id_prestamo || plan?.id || plan?.id_plan) === String(values.id_activo));
  const getPlanName = (plan) => {
    if (!plan) {
      return values.id_activo || 'Sin plan';
    }

    if (typeof plan === 'string' || typeof plan === 'number') {
      return String(plan);
    }

    const nestedPlan = plan.plan || plan.prestamo || plan.tipo;

    if (nestedPlan && typeof nestedPlan === 'object') {
      return getPlanName(nestedPlan);
    }

    return plan.nombre || plan.label || plan.name || plan.titulo || plan.title || plan.tipo || `Plan ${plan.id || values.id_activo}`;
  };
  const planName = getPlanName(selectedPlan);

  return (
    <div className="step">
      <h3>Confirmacion</h3>
      <p>Revisa la informacion antes de enviar la solicitud.</p>
      <dl className="profile-list">
        <dt>Plan</dt>
        <dd>{planName}</dd>
        <dt>Monto</dt>
        <dd>{values.cantidad || 'Sin capturar'}</dd>
        <dt>Metodo de aval</dt>
        <dd>{values.avalMethod === 'documents' ? 'Documentos del aval' : 'Codigo de aval'}</dd>
        {values.avalMethod === 'code' && (
          <>
            <dt>Codigo de aval</dt>
            <dd>{values.codigo_aval || 'No capturado'}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

export default LoanStepConfirmation;
