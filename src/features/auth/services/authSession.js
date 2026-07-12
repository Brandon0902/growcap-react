export const AUTH_TOKEN_KEY = 'growcap_token';
export const AUTH_USER_KEY = 'growcap_user';

function resolveStorage(storage) {
  return storage ?? globalThis.localStorage ?? null;
}

export function getStoredAuthToken(storage) {
  try {
    return resolveStorage(storage)?.getItem(AUTH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function storeAuthToken(token, storage) {
  if (!token) return;

  try {
    resolveStorage(storage)?.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Ignore storage failures; cookie auth can still work.
  }
}

export function clearStoredAuthToken(storage) {
  try {
    resolveStorage(storage)?.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function clearLegacyAuthUser(storage) {
  try {
    resolveStorage(storage)?.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignore storage failures.
  }
}