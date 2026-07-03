import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLoanRequest } from '../src/features/loans/services/loanRequest.js';
import { normalizeApiError } from '../src/api/apiUtils.js';

test('code guarantor loan uses numeric JSON fields', () => {
  const request = buildLoanRequest({ id_activo: '1', cantidad: '2000', codigo_aval: ' CAGO3086 ' });
  assert.deepEqual(request.data, { id_activo: 1, cantidad: 2000, codigo_aval: 'CAGO3086' });
  assert.deepEqual(request.config, {});
});

test('document guarantor loan remains multipart', () => {
  const file = new Blob(['pdf'], { type: 'application/pdf' });
  const request = buildLoanRequest({ id_activo: '1', cantidad: '2000', doc_ine_frente: file });
  assert.equal(request.data instanceof FormData, true);
  assert.equal(request.config.headers['Content-Type'], 'multipart/form-data');
});

test('422 details are exposed as field errors and a specific message', () => {
  const normalized = normalizeApiError({ response: { status: 422, data: { message: 'The given data was invalid.', details: { id_activo: ['Expected number, received nan'] } } } });
  assert.deepEqual(normalized.fieldErrors, { id_activo: ['El plan seleccionado no es válido.'] });
  assert.equal(normalized.message, 'El plan seleccionado no es válido.');
});
