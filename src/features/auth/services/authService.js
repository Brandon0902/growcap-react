import { ENDPOINTS } from '../../../api/endpoints.js';
import axiosClient, { backendClient } from '../../../api/axiosClient.js';
import { clearStoredAuthToken, storeAuthToken } from './authSession.js';

const DEFAULT_DEVICE = 'cliente-web';

function getResponseUser(data, fallbackEmail) {
  return data?.user || data?.data?.user || data?.data || data || { email: fallbackEmail, name: 'Usuario Growcap' };
}

function normalizeAuthError(error) {
  const response = error?.response;
  const data = response?.data;

  if (response?.status === 422) {
    return {
      message: data?.message || 'Revisa los datos ingresados.',
      fieldErrors: data?.errors || {},
      status: response.status,
    };
  }

  if (response?.status === 401 || response?.status === 403) {
    return {
      message: data?.message || data?.error || 'Credenciales incorrectas.',
      fieldErrors: {},
      status: response.status,
    };
  }

  return {
    message: data?.message || data?.error || 'No fue posible iniciar sesion. Intenta nuevamente.',
    fieldErrors: {},
    status: response?.status,
  };
}

async function prepareCookieAuth() {
  try {
    await backendClient.get(ENDPOINTS.auth.csrfCookie);
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }
  }
}

export async function login(credentials) {
  try {
    const payload = {
      email: credentials.email?.trim(),
      password: credentials.password,
      device: DEFAULT_DEVICE,
    };

    const { data: tokenData } = await axiosClient.post(ENDPOINTS.auth.login, payload);
    storeAuthToken(tokenData?.access_token);

    try {
      await prepareCookieAuth();
      await axiosClient.post(ENDPOINTS.auth.loginCookie, payload);
    } catch (cookieError) {
      if (cookieError?.response?.status === 401 || cookieError?.response?.status === 403) {
        throw cookieError;
      }
    }

    const user = getResponseUser(tokenData, payload.email);

    return {
      user,
    };
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function getAuthenticatedUser() {
  const { data } = await axiosClient.get(ENDPOINTS.auth.meCookie);

  return getResponseUser(data);
}

export async function logout() {
  try {
    await axiosClient.post(ENDPOINTS.auth.logoutCookie);
  } catch (error) {
    if (error?.response?.status !== 401) {
      throw normalizeAuthError(error);
    }
  } finally {
    clearStoredAuthToken();
  }
}
