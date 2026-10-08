import axiosClient from '../../../api/axiosClient.js';
import { ENDPOINTS } from '../../../api/endpoints.js';

export async function getMyProfileData() {
  const { data } = await axiosClient.get(ENDPOINTS.client.myData);

  return {
    data,
    endpoint: ENDPOINTS.client.myData,
  };
}

export const getProfile = getMyProfileData;

export async function changeClientPassword({ current_password, password, password_confirmation }) {
  const { data } = await axiosClient.post(ENDPOINTS.client.password, {
    current_password,
    password,
    password_confirmation,
  });

  return data;
}

export async function resetClientNip({ current_password, nip }) {
  const { data } = await axiosClient.post(ENDPOINTS.client.resetNip, {
    current_password,
    nip,
  });

  return data;
}

export async function updateClientProfile(profileData) {
  const { data } = await axiosClient.put(ENDPOINTS.client.myData, profileData);
  return data;
}

export async function updateBeneficiaries(beneficiariesData) {
  const { data } = await axiosClient.put(ENDPOINTS.client.myData, beneficiariesData);
  return data;
}

export async function submitProfileCorrection(correctionData) {
  const endpoint = ENDPOINTS.client.correctionRequest || '/cliente/solicitud-correccion';
  const { data } = await axiosClient.post(endpoint, correctionData);
  return data;
}

