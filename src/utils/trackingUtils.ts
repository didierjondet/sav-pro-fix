/**
 * Génère une URL de suivi raccourcie pour les SMS
 * Format: fixway.fr/track/[slug] au lieu de l'URL complète
 */
export function generateShortTrackingUrl(trackingSlug: string): string {
  if (!trackingSlug) return '';
  return `fixway.fr/track/${trackingSlug}`;
}

/**
 * Génère une URL de suivi complète pour l'affichage web
 */
export function generateFullTrackingUrl(trackingSlug: string): string {
  if (!trackingSlug) return '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/track/${trackingSlug}`;
}