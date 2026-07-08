export function buildSavingsRequestPayload(values, suggestedFrequency, seasonal) {
  const paymentMethod = values.payment_method === 'later' ? 'definir_despues' : values.payment_method;
  const payload = {
    ahorro_id: Number(values.ahorro_id),
    cuota: Number(values.cuota),
    frecuencia_pago: suggestedFrequency || undefined,
    monto_inicial: Number(values.monto_inicial || 0),
    monto_ahorro: Number(values.monto_inicial || 0),
    pago_inicial: paymentMethod,
    pay_method: values.payment_method === 'later' ? undefined : values.payment_method,
  };

  if (seasonal) {
    payload.fecha_fin = values.fecha_fin;
  }

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

export function buildSavingsCheckoutPayload({ action, savingsId, cuota, monto_inicial: initialAmount, origin, oldSubscriptionId }) {
  const amount = Number(initialAmount || 0);
  const fee = Number(cuota || 0);
  const payload = {
    action,
    charge_cuota_now: true,
    charge_monto_now: amount > 0,
    cuota: fee,
    monto_inicial: amount,
    return_url: `${origin}/ahorro/stripe/return?ahorro_id=${savingsId}&action=${action}`,
  };

  if (action === 'update') {
    payload.add_cuota = fee;
    payload.add_monto = amount;
    if (oldSubscriptionId) payload.old_subscription_id = oldSubscriptionId;
  }

  return payload;
}

export function formatSavingsRequestError(stage, message) {
  const prefix = stage === 'checkout' ? 'No se pudo iniciar Stripe Checkout' : 'No se pudo crear el ahorro';
  return `${prefix}: ${message}`;
}
