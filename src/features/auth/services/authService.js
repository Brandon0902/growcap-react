import { ENDPOINTS } from '../../../api/endpoints.js';
import { clearSession, setToken, setUser } from '../../../utils/storage.js';

export async function login(credentials) {
  // TODO: Conectar con ENDPOINTS.auth.login cuando la API este disponible.
  setToken('development-token');
  setUser({
    name: 'Usuario Growcap',
    email: credentials.email,
  });

  return {
    endpoint: ENDPOINTS.auth.login,
    token: 'development-token',
  };
}

export async function logout() {
  // TODO: Conectar con ENDPOINTS.auth.logout si el backend requiere invalidar token.
  clearSession();
  return { endpoint: ENDPOINTS.auth.logout };
}
