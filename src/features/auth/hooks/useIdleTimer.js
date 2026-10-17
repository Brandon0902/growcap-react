import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from './useAuth.js';

export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos
export const COUNTDOWN_SECONDS = 60; // 60 segundos para responder
const ACTIVITY_STORAGE_KEY = 'growcap_last_activity';
const THROTTLE_MS = 1000;

export function useIdleTimer({
  timeout = INACTIVITY_TIMEOUT_MS,
  countdown = COUNTDOWN_SECONDS,
  onTimeout,
} = {}) {
  const { isAuthenticated, logout } = useAuth();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(countdown);

  const lastActivityRef = useRef(Date.now());
  const warningStartedRef = useRef(null);
  const lastThrottleRef = useRef(0);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    } catch {
      // Ignorar restricciones de almacenamiento local
    }
  }, []);

  const resetTimer = useCallback(() => {
    updateActivity();
    setIsWarningOpen(false);
    warningStartedRef.current = null;
    setRemainingSeconds(countdown);
  }, [countdown, updateActivity]);

  const handleTimeout = useCallback(() => {
    setIsWarningOpen(false);
    warningStartedRef.current = null;
    if (onTimeout) {
      onTimeout();
    } else {
      logout();
    }
  }, [logout, onTimeout]);

  // Escucha de eventos de actividad de usuario
  useEffect(() => {
    if (!isAuthenticated) {
      setIsWarningOpen(false);
      warningStartedRef.current = null;
      return;
    }

    updateActivity();

    const handleUserActivity = () => {
      // Si la alerta está visible, solo una acción explícita la reinicia
      if (warningStartedRef.current) return;

      const now = Date.now();
      if (now - lastThrottleRef.current > THROTTLE_MS) {
        lastThrottleRef.current = now;
        updateActivity();
      }
    };

    const handleStorageChange = (event) => {
      if (event.key === ACTIVITY_STORAGE_KEY && event.newValue) {
        const remoteTime = Number(event.newValue);
        if (!isNaN(remoteTime)) {
          lastActivityRef.current = Math.max(lastActivityRef.current, remoteTime);
          if (Date.now() - remoteTime < timeout) {
            setIsWarningOpen(false);
            warningStartedRef.current = null;
            setRemainingSeconds(countdown);
          }
        }
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((eventType) => {
      window.addEventListener(eventType, handleUserActivity, { passive: true });
    });
    window.addEventListener('storage', handleStorageChange);

    return () => {
      events.forEach((eventType) => {
        window.removeEventListener(eventType, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAuthenticated, timeout, countdown, updateActivity]);

  // Intervalo de verificación cada 1 segundo
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const now = Date.now();

      try {
        const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
        if (stored) {
          const storedTime = Number(stored);
          if (!isNaN(storedTime) && storedTime > lastActivityRef.current) {
            lastActivityRef.current = storedTime;
          }
        }
      } catch {
        // Ignorar
      }

      const idleDuration = now - lastActivityRef.current;

      if (!warningStartedRef.current) {
        if (idleDuration >= timeout) {
          warningStartedRef.current = now;
          setIsWarningOpen(true);
          setRemainingSeconds(countdown);
        }
      } else {
        const elapsedSinceWarning = Math.floor((now - warningStartedRef.current) / 1000);
        const left = Math.max(0, countdown - elapsedSinceWarning);
        setRemainingSeconds(left);

        if (left <= 0) {
          clearInterval(interval);
          handleTimeout();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, timeout, countdown, handleTimeout]);

  return {
    isWarningOpen,
    remainingSeconds,
    resetTimer,
  };
}

export default useIdleTimer;
