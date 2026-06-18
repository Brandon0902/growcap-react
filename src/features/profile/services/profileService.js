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
