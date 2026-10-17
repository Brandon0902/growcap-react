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

export async function solicitarRetiroSaldoGeneral({ monto, nip, origen_tipo, origen_id }) {
  const { data } = await axiosClient.post(ENDPOINTS.client.solicitarRetiroGeneral, {
    monto,
    nip,
    ...(origen_tipo ? { origen_tipo } : {}),
    ...(origen_id !== undefined && origen_id !== null ? { origen_id } : {}),
  });

  return {
    data,
    endpoint: ENDPOINTS.client.solicitarRetiroGeneral,
  };
}

