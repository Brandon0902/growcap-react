import { ENDPOINTS } from '../../../api/endpoints.js';
import axiosClient from '../../../api/axiosClient.js';
import { extractCollection, extractMeta, toFormData } from '../../../api/apiUtils.js';

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
    raw: data,
  };
}

export async function createLoanRequest(payload) {
  const { data } = await axiosClient.post(ENDPOINTS.loans.base, toFormData(payload), {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

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
