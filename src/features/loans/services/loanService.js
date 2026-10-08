import { ENDPOINTS } from '../../../api/endpoints.js';
import axiosClient from '../../../api/axiosClient.js';
import { extractCollection, extractMeta } from '../../../api/apiUtils.js';
import { buildLoanRequest } from './loanRequest.js';

export async function getLoans(params = {}) {
  const { data } = await axiosClient.get(ENDPOINTS.loans.base, { params });

  return {
    data: extractCollection(data),
    endpoint: ENDPOINTS.loans.base,
    meta: extractMeta(data),
    raw: data,
  };
}

export async function getLoanPlans() {
  const { data } = await axiosClient.get(ENDPOINTS.loans.plans);

  return {
    data: extractCollection(data),
    endpoint: ENDPOINTS.loans.plans,
    meta: extractMeta(data),
    prerequisites: data?.prerequisites ?? null,
    raw: data,
  };
}

export async function getClienteAvalToken() {
  const { data } = await axiosClient.get(ENDPOINTS.loans.avalToken);
  return data?.data ?? null;
}

export async function generateClienteAvalToken(payload = { accept_terms: true }) {
  const { data } = await axiosClient.post(ENDPOINTS.loans.generateAvalToken, payload);
  return data?.data ?? null;
}

export async function validateLoanAvalToken(token) {
  const { data } = await axiosClient.post(ENDPOINTS.loans.validateAvalToken, { token });
  return data;
}

export async function createLoanRequest(payload) {
  const request = buildLoanRequest(payload);
  const { data } = await axiosClient.post(ENDPOINTS.loans.base, request.data, request.config);

  return {
    data,
    endpoint: ENDPOINTS.loans.base,
  };
}

export async function deleteLoanRequest(id) {
  const { data } = await axiosClient.delete(ENDPOINTS.loans.byId(id));

  return {
    data,
    endpoint: ENDPOINTS.loans.byId(id),
  };
}

export async function cancelLoanRequest(id, payload = {}) {
  const { data } = await axiosClient.post(ENDPOINTS.loans.cancel(id), payload);
  return data;
}

export async function simulateLoanRequest(payload) {
  // Try/catch will be handled by the component using normalizeApiError
  const { data } = await axiosClient.post(ENDPOINTS.loans.base + '/simular', payload);
  return data;
}

export async function getLoanBankDetails() {
  const { data } = await axiosClient.get(ENDPOINTS.loans.bankDetails);
  return data;
}

export async function submitLoanAbonoSpei(id, formData) {
  const { data } = await axiosClient.post(ENDPOINTS.loans.abonoSpei(id), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function createLoanMercadoPagoPreference(id, monto) {
  const { data } = await axiosClient.post(ENDPOINTS.loans.mercadoPagoPreference(id), {
    monto,
  });
  return data;
}

export async function confirmLoanMercadoPago(payload) {
  const { data } = await axiosClient.post(ENDPOINTS.loans.mercadoPagoConfirm, payload);
  return data;
}

export async function getPendingAvalRequests() {
  const { data } = await axiosClient.get(ENDPOINTS.loans.pendingAvalRequests);
  const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  return {
    data: items,
    raw: data,
  };
}

export async function respondAvalRequest(prestamoId, payload) {
  const { data } = await axiosClient.post(ENDPOINTS.loans.respondAval(prestamoId), payload);
  return data;
}

export async function getLoanMovements(id) {
  const { data } = await axiosClient.get(`${ENDPOINTS.loans.base}/${id}/movimientos`);
  return data;
}

export async function getLoanStatement(prestamoId = null, params = {}) {
  const endpoint = ENDPOINTS.loans.statement(prestamoId);
  const { data } = await axiosClient.get(endpoint, { params });
  return data;
}

