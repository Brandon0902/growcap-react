import { ENDPOINTS } from '../../../api/endpoints.js';
import axiosClient from '../../../api/axiosClient.js';
import { extractCollection, extractMeta } from '../../../api/apiUtils.js';

export async function getInvestments(params = {}) {
  const { data } = await axiosClient.get(ENDPOINTS.investments.base, { params });

  return {
    data: extractCollection(data),
    endpoint: ENDPOINTS.investments.base,
    meta: extractMeta(data),
    raw: data,
  };
}

export async function getInvestmentPlans() {
  const { data } = await axiosClient.get(ENDPOINTS.investments.plans);

  return {
    data: extractCollection(data),
    endpoint: ENDPOINTS.investments.plans,
    meta: extractMeta(data),
    raw: data,
  };
}

export async function createInvestmentRequest(payload) {
  const { data } = await axiosClient.post(ENDPOINTS.investments.base, payload);

  return {
    data,
    endpoint: ENDPOINTS.investments.base,
  };
}

export async function createInvestmentCheckout(id, payload = {}) {
  const { data } = await axiosClient.post(ENDPOINTS.investments.checkout(id), payload);

  return {
    data,
    endpoint: ENDPOINTS.investments.checkout(id),
  };
}

export async function deleteInvestmentRequest(id) {
  const { data } = await axiosClient.delete(ENDPOINTS.investments.byId(id));

  return {
    data,
    endpoint: ENDPOINTS.investments.byId(id),
  };
}

export async function payInvestmentWithBalance(id) {
  const { data } = await axiosClient.post(ENDPOINTS.investments.payWithBalance(id));

  return {
    data,
    endpoint: ENDPOINTS.investments.payWithBalance(id),
  };
}
