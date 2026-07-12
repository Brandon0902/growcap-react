import test from 'node:test';
import assert from 'node:assert/strict';
import { getSavingsPlanPeriod } from '../src/features/savings/services/savingsPlanDisplay.js';

test('period savings plan uses numeric meses_minimos as months', () => {
  assert.equal(getSavingsPlanPeriod({ tipo_ahorro: 'periodo', meses_minimos: 3 }), '3 meses');
});

test('period savings plan uses string meses_minimos as months', () => {
  assert.equal(getSavingsPlanPeriod({ tipo_ahorro: 'periodo', meses_minimos: '3' }), '3 meses');
});

test('period savings plan uses singular month for one month', () => {
  assert.equal(getSavingsPlanPeriod({ tipo_ahorro: 'periodo', meses_minimos: 1 }), '1 mes');
});