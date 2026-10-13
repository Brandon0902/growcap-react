import axiosClient from '../../../api/axiosClient.js';
import { ENDPOINTS } from '../../../api/endpoints.js';

export async function getClienteSaldoDisponible() {
  const { data } = await axiosClient.get(ENDPOINTS.client.availableBalance);

  return {
    data,
    endpoint: ENDPOINTS.client.availableBalance,
  };
}

export async function getClienteMovimientosSaldo(params = {}) {
  const { data } = await axiosClient.get(ENDPOINTS.client.movements, { params });

  return {
    data,
    endpoint: ENDPOINTS.client.movements,
  };
}

export async function solicitarRetiroSaldoGeneral({ monto, nip }) {
  const { data } = await axiosClient.post(ENDPOINTS.client.solicitarRetiroGeneral, { monto, nip });

  return {
    data,
    endpoint: ENDPOINTS.client.solicitarRetiroGeneral,
  };
}

