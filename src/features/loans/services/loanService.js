import { ENDPOINTS } from '../../../api/endpoints.js';

export async function getLoanPlans() {
  // TODO: Consultar ENDPOINTS.loans.plans con axiosClient.
  return { endpoint: ENDPOINTS.loans.plans, data: [] };
}

export async function createLoanRequest(payload) {
  // TODO: Enviar solicitud a ENDPOINTS.loans.base con axiosClient.
  return { endpoint: ENDPOINTS.loans.base, payload };
}
