import assert from 'node:assert/strict';
import test from 'node:test';

import { parseStripeReturn } from '../src/features/payments/services/stripeReturn.js';

test('cancel status wins over an entity id and never looks like a successful payment', () => {
  const result = parseStripeReturn(
    new URLSearchParams('ahorro_id=25&action=create&status=cancel'),
    'ahorro_id',
  );

  assert.equal(result.hasReturn, true);
  assert.equal(result.isCanceled, true);
  assert.equal(result.isSuccess, false);
  assert.equal(result.entityId, '25');
  assert.equal(result.action, 'create');
});

test('success requires an explicit Stripe success signal and preserves the session id', () => {
  const result = parseStripeReturn(
    new URLSearchParams('inversion_id=44&status=success&session_id=cs_paid_44'),
    'inversion_id',
  );

  assert.equal(result.isSuccess, true);
  assert.equal(result.isCanceled, false);
  assert.equal(result.sessionId, 'cs_paid_44');
});

test('an entity id by itself is not proof of payment', () => {
  const result = parseStripeReturn(
    new URLSearchParams('ahorro_id=25'),
    'ahorro_id',
  );

  assert.equal(result.hasReturn, false);
  assert.equal(result.isSuccess, false);
  assert.equal(result.isCanceled, false);
});
