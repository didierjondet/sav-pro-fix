import { useCallback, useEffect, useRef, useState } from 'react';

declare const __APP_BUILD_ID__: string;

const CURRENT_BUILD_ID =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

const POLL_INTERVAL = 1000 * 120;

/**
 * Vérifie périodiquement /version.json pour détecter une nouvelle mise en ligne.
 */
export function useAppVersion() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (checking.current || CURRENT_BUILD_ID === 'dev') return;
    checking.current = true;
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.buildId && data.buildId !== CURRENT_BUILD_ID) {
        setUpdateAvailable(true);
      }
    } catch {
      // Hors ligne ou fichier absent : on ignore silencieusement
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    check();
    const interval = window.setInterval(check, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  return { updateAvailable, reload, buildId: CURRENT_BUILD_ID };
}
