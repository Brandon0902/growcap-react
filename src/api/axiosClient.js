import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const backendClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || '',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
});

function shouldSkipUnauthorizedEvent(config) {
  const url = String(config?.url || '');

  return url.includes('/auth/me-cookie') || url.includes('/auth/login-cookie');
}

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !shouldSkipUnauthorizedEvent(error.config)) {
      window.dispatchEvent(new CustomEvent('growcap:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
