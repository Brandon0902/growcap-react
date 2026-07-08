import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeApiError } from '../src/api/apiUtils.js';
import { buildSavingsCheckoutPayload, buildSavingsRequestPayload, formatSavingsRequestError } from '../src/features/savings/services/savingsRequest.js';

test('savings request sends numeric fields accepted by Render', () => {
  assert.deepEqual(buildSavingsRequestPayload({ ahorro_id: '1', cuota: '300', monto_inicial: '', payment_method: 'stripe' }, 'Mensual', false), {
    ahorro_id: 1,
    cuota: 300,
    frecuencia_pago: 'Mensual',
    monto_inicial: 0,
    monto_ahorro: 0,
    pago_inicial: 'stripe',
    pay_method: 'stripe',
  });
});

test('Stripe checkout uses the real savings route and numeric values', () => {
  assert.deepEqual(buildSavingsCheckoutPayload({ action: 'create', savingsId: 13, cuota: '300', monto_inicial: '', origin: 'https://growcap.example', oldSubscriptionId: null }), {
    action: 'create',
    charge_cuota_now: true,
    charge_monto_now: false,
    cuota: 300,
    monto_inicial: 0,
    return_url: 'https://growcap.example/ahorro/stripe/return?ahorro_id=13&action=create',
  });
});

test('savings error identifies the failing request stage', () => {
  assert.equal(formatSavingsRequestError('checkout', 'El retorno no es v\u00e1lido.'), 'No se pudo iniciar Stripe Checkout: El retorno no es v\u00e1lido.');
});

test('Stripe validation details are translated to actionable messages', () => {
  const normalized = normalizeApiError({ response: { status: 422, data: { details: { return_url: ['Invalid url'] } } } });
  assert.equal(normalized.message, 'La URL de retorno de Stripe no es válida.');
});
