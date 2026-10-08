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

export async function updateSavingsFee(id, payload = {}) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.changeFee(id), payload);

  return {
    data,
    endpoint: ENDPOINTS.savings.changeFee(id),
  };
}

export async function transferSavings(id, payload = {}) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.transfer(id), payload);

  return {
    data,
    endpoint: ENDPOINTS.savings.transfer(id),
  };
}

export async function withdrawSavings(id, payload = {}) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.withdraw(id), payload);

  return {
    data,
    endpoint: ENDPOINTS.savings.withdraw(id),
  };
}

export async function getSavingsMovements(id, params = {}) {
  const { data } = await axiosClient.get(ENDPOINTS.savings.movements(id), { params });

  return {
    data: extractCollection(data),
    endpoint: ENDPOINTS.savings.movements(id),
    raw: data,
  };
}

export async function getSavingsStatement(id = null, params = {}) {
  const endpoint = ENDPOINTS.savings.statement(id);
  const { data } = await axiosClient.get(endpoint, { params });

  return {
    data,
    endpoint,
    raw: data,
  };
}

export async function pauseSavings(id, payload = {}) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.pause(id), payload);

  return {
    data,
    endpoint: ENDPOINTS.savings.pause(id),
  };
}

export async function resumeSavings(id) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.resume(id), {});

  return {
    data,
    endpoint: ENDPOINTS.savings.resume(id),
  };
}

export async function getBankDetails() {
  const { data } = await axiosClient.get(ENDPOINTS.savings.bankDetails);
  return data;
}

export async function submitVoluntaryDeposit(id, formData) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.voluntaryDeposit(id), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getDepositLimit(id) {
  const { data } = await axiosClient.get(ENDPOINTS.savings.depositLimit(id));
  return data;
}

export async function getCodiQr(id, monto) {
  const { data } = await axiosClient.get(ENDPOINTS.savings.codiQr(id), {
    params: { monto },
  });
  return data;
}

export async function createMercadoPagoPreference(id, monto) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.mercadoPagoPreference(id), {
    monto,
  });
  return data;
}

export async function confirmMercadoPago(payload) {
  const { data } = await axiosClient.post(ENDPOINTS.savings.mercadoPagoConfirm, payload);
  return data;
}





