import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

const SESSION_KEY = 'fixway_usage_session_id';
const CLICK_SAMPLING = 1; // 1 = tous les clics

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getDevice() {
  return window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
}

// Normalise les chemins pour éviter d'enregistrer des identifiants de dossiers
export function normalizePath(pathname: string) {
  return pathname
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

export function useUsageTracking() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();

  const ctxRef = useRef({ userId: null as string | null, shopId: null as string | null, role: null as string | null });
  ctxRef.current = {
    userId: user?.id ?? null,
    shopId: (profile as any)?.shop_id ?? null,
    role: (profile as any)?.role ?? null,
  };

  const pathRef = useRef(normalizePath(location.pathname));
  const accumulatedRef = useRef(0);
  const startedRef = useRef<number | null>(null);

  // Envoi d'une vue de page
  useEffect(() => {
    const flush = (path: string) => {
      const ctx = ctxRef.current;
      if (startedRef.current != null) {
        accumulatedRef.current += Date.now() - startedRef.current;
        startedRef.current = null;
      }
      const duration = Math.min(accumulatedRef.current, 1000 * 60 * 60);
      accumulatedRef.current = 0;
      if (!ctx.userId || duration < 500) return;
      void supabase.from('usage_page_views' as any).insert({
        user_id: ctx.userId,
        shop_id: ctx.shopId,
        role: ctx.role,
        path,
        duration_ms: Math.round(duration),
        device: getDevice(),
        session_id: getSessionId(),
      } as any);
    };

    const previousPath = pathRef.current;
    const newPath = normalizePath(location.pathname);
    if (previousPath !== newPath) {
      flush(previousPath);
      pathRef.current = newPath;
    }
    startedRef.current = Date.now();

    const onVisibility = () => {
      if (document.hidden) {
        if (startedRef.current != null) {
          accumulatedRef.current += Date.now() - startedRef.current;
          startedRef.current = null;
        }
      } else if (startedRef.current == null) {
        startedRef.current = Date.now();
      }
    };
    const onUnload = () => flush(pathRef.current);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onUnload);
      flush(newPath);
    };
  }, [location.pathname]);

  // Capture des clics pour la heatmap
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const ctx = ctxRef.current;
      if (!ctx.userId) return;
      if (Math.random() > CLICK_SAMPLING) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!w || !h) return;
      const target = e.target as HTMLElement | null;
      const label =
        target?.closest('button,a,[role="tab"]')?.textContent?.trim().slice(0, 60) || null;
      void supabase.from('usage_click_events' as any).insert({
        user_id: ctx.userId,
        shop_id: ctx.shopId,
        path: pathRef.current,
        x_pct: Number(((e.clientX / w) * 100).toFixed(2)),
        y_pct: Number((((e.clientY + window.scrollY) / Math.max(document.body.scrollHeight, h)) * 100).toFixed(2)),
        viewport_w: w,
        viewport_h: h,
        device: getDevice(),
        element_label: label,
      } as any);
    };

    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);
}
