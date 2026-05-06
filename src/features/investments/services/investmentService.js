import { ENDPOINTS } from '../../../api/endpoints.js';

export async function getInvestmentPlans() {
  // TODO: Consultar ENDPOINTS.investments.plans con axiosClient.
  return { endpoint: ENDPOINTS.investments.plans, data: [] };
}

export async function createInvestmentRequest(payload) {
  // TODO: Enviar solicitud a ENDPOINTS.investments.base con axiosClient.
  return { endpoint: ENDPOINTS.investments.base, payload };
}
