import { useAuthContext } from '../context/useAuthContext.js';

function useAuth() {
  return useAuthContext();
}

export default useAuth;
