import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_KEY = 'fixway_usage_session_id';
const CLICK_SAMPLING = 1; // 1 = tous les clics
const FLUSH_INTERVAL_MS = 10000;
const MAX_QUEUE = 200;

type UsageEvent = Record<string, unknown> & { type: 'page' | 'click'; path: string };

let queue: UsageEvent[] = [];
let sending = false;

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

function enqueue(event: UsageEvent) {
  if (queue.length >= MAX_QUEUE) return;
  queue.push(event);
}

async function flushQueue() {
  if (sending || queue.length === 0) return;
  const batch = queue;
  queue = [];
  sending = true;
  try {
    const { error } = await supabase.rpc('record_usage_events' as any, { _events: batch as any });
    if (error) {
      console.error('[usage] enregistrement impossible:', error.message);
      // On remet le lot en tête de file pour un nouvel essai
      queue = [...batch, ...queue].slice(0, MAX_QUEUE);
    }
  } catch (e: any) {
    console.error('[usage] enregistrement impossible:', e?.message ?? e);
    queue = [...batch, ...queue].slice(0, MAX_QUEUE);
  } finally {
    sending = false;
  }
}

export function useUsageTracking() {
  const { user } = useAuth();
  const location = useLocation();

  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  const pathRef = useRef(normalizePath(location.pathname));
  const accumulatedRef = useRef(0);
  const startedRef = useRef<number | null>(null);

  // Envoi périodique
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (userIdRef.current) void flushQueue();
    }, FLUSH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Vue de page
  useEffect(() => {
    const record = (path: string) => {
      if (startedRef.current != null) {
        accumulatedRef.current += Date.now() - startedRef.current;
        startedRef.current = null;
      }
      const duration = Math.min(accumulatedRef.current, 1000 * 60 * 60);
      accumulatedRef.current = 0;
      if (!userIdRef.current || duration < 500) return;
      enqueue({
        type: 'page',
        path,
        duration_ms: Math.round(duration),
        device: getDevice(),
        session_id: getSessionId(),
      });
    };

    const previousPath = pathRef.current;
    const newPath = normalizePath(location.pathname);
    if (previousPath !== newPath) {
      record(previousPath);
      pathRef.current = newPath;
      void flushQueue();
    }
    startedRef.current = Date.now();

    const onVisibility = () => {
      if (document.hidden) {
        record(pathRef.current);
        void flushQueue();
      } else if (startedRef.current == null) {
        startedRef.current = Date.now();
      }
    };
    const onPageHide = () => {
      record(pathRef.current);
      void flushQueue();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      record(newPath);
    };
  }, [location.pathname]);

  // Capture des clics pour la heatmap
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!userIdRef.current) return;
      if (Math.random() > CLICK_SAMPLING) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (!w || !h) return;
      const target = e.target as HTMLElement | null;
      const label =
        target?.closest('button,a,[role="tab"]')?.textContent?.trim().slice(0, 60) || null;
      const docHeight = Math.max(document.documentElement.scrollHeight, h);
      enqueue({
        type: 'click',
        path: pathRef.current,
        x_pct: Number(((e.clientX / w) * 100).toFixed(2)),
        y_pct: Number((((e.clientY + window.scrollY) / docHeight) * 100).toFixed(2)),
        viewport_w: w,
        viewport_h: h,
        device: getDevice(),
        element_label: label,
      });
    };

    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  // Envoi immédiat dès qu'un utilisateur est identifié (les événements en attente partent)
  useEffect(() => {
    if (user?.id) void flushQueue();
  }, [user?.id]);
}
