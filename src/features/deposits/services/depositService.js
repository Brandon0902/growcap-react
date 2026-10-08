import axiosClient from '../../../api/axiosClient.js';
import { ENDPOINTS } from '../../../api/endpoints.js';

export async function getDepositos(params = {}) {
  const { data } = await axiosClient.get(ENDPOINTS.deposits.base, { params });
  return data;
}

export async function createDeposito(formData) {
  const { data } = await axiosClient.post(ENDPOINTS.deposits.base, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function deleteDeposito(id) {
  const { data } = await axiosClient.delete(ENDPOINTS.deposits.byId(id));
  return data;
}

export async function getBankDetails() {
  try {
    const { data } = await axiosClient.get(ENDPOINTS.savings.bankDetails);
    return data;
  } catch {
    return {
      data: {
        banco: 'BBVA México / STP',
        beneficiario: 'GROWCAP S.A. DE C.V.',
        clabe: '012180015040590130',
        cuenta: '1504059013',
      },
    };
  }
}
