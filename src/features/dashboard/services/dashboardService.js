import axiosClient from '../../../api/axiosClient.js';
import { ENDPOINTS } from '../../../api/endpoints.js';

export async function getClienteSaldoDisponible() {
  const { data } = await axiosClient.get(ENDPOINTS.client.availableBalance);

  return {
    data,
    endpoint: ENDPOINTS.client.availableBalance,
  };
}
