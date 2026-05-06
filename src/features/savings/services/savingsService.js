import { ENDPOINTS } from '../../../api/endpoints.js';

export async function getSavingsPlans() {
  // TODO: Consultar ENDPOINTS.savings.plans con axiosClient.
  return { endpoint: ENDPOINTS.savings.plans, data: [] };
}

export async function createSavingsRequest(payload) {
  // TODO: Enviar solicitud a ENDPOINTS.savings.base con axiosClient.
  return { endpoint: ENDPOINTS.savings.base, payload };
}
