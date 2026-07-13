import { ENDPOINTS } from '../../../api/endpoints.js';
import axiosClient from '../../../api/axiosClient.js';
import { extractCollection, extractMeta } from '../../../api/apiUtils.js';

export async function getSavings(params = {}) {
  const { data } = await axiosClient.get(ENDPOINTS.savings.base, { params });

  return {
    data: extractCollection(data),
    endpoint: ENDPOINTS.savings.base,
    meta: extractMeta(data),
    raw: data,
  };
}

export async function getSavingsPlans() {
  const { data } = await axiosClient.get(ENDPOINTS.savings.plans);

  return {
    endpoint: ENDPOINTS.savings.plans,
    meta: extractMeta(data),
    raw: data,
    data: extractCollection(data),
  };
}

export async function getSavingsFrequency() {
  const { data } = await axiosClient.get(ENDPOINTS.savings.frequency);

  return {
    data,
    endpoint: ENDPOINTS.savings.frequency,
  };
}

export async function createSavingsRequest(payload) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.base, payload);

  return {
    data,
    endpoint: ENDPOINTS.savings.base,
  };
}

export async function createSavingsCheckout(id, payload = {}) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.checkout(id), payload);

  return {
    data,
    endpoint: ENDPOINTS.savings.checkout(id),
  };
}

export async function confirmSavingsCheckout(id, sessionId) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.confirmCheckout(id), {
    session_id: sessionId,
  });

  return {
    data,
    endpoint: ENDPOINTS.savings.confirmCheckout(id),
  };
}

export async function deleteSavingsRequest(id) {
  const { data } = await axiosClient.delete(ENDPOINTS.savings.byId(id));

  return {
    data,
    endpoint: ENDPOINTS.savings.byId(id),
  };
}
