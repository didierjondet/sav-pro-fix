import { useUsageTracking } from '@/hooks/useUsageTracking';

/**
 * Monté une seule fois sous le Router : mesure la navigation de tous les
 * écrans internes (y compris /super-admin et /m/*), uniquement pour les
 * utilisateurs connectés.
 */
export default function UsageTracker() {
  useUsageTracking();
  return null;
}
