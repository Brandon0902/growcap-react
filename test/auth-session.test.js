import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearLegacyAuthUser,
  clearStoredAuthToken,
  getStoredAuthToken,
  storeAuthToken,
} from '../src/features/auth/services/authSession.js';

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test('auth token is stored and read for bearer fallback', () => {
  const storage = fakeStorage();

  storeAuthToken('jwt-token', storage);

  assert.equal(getStoredAuthToken(storage), 'jwt-token');
});

test('legacy user cleanup keeps auth token for stripe return reloads', () => {
  const storage = fakeStorage({
    [AUTH_TOKEN_KEY]: 'jwt-token',
    [AUTH_USER_KEY]: '{"id":36}',
  });

  clearLegacyAuthUser(storage);

  assert.equal(storage.getItem(AUTH_TOKEN_KEY), 'jwt-token');
  assert.equal(storage.getItem(AUTH_USER_KEY), null);
});

test('logout cleanup removes bearer fallback token', () => {
  const storage = fakeStorage({ [AUTH_TOKEN_KEY]: 'jwt-token' });

  clearStoredAuthToken(storage);

  assert.equal(getStoredAuthToken(storage), null);
});