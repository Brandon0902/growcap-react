import { useMemo } from 'react';
import { getToken, getUser } from '../../../utils/storage.js';

function useAuth() {
  return useMemo(
    () => ({
      isAuthenticated: Boolean(getToken()),
      user: getUser(),
    }),
    [],
  );
}

export default useAuth;
