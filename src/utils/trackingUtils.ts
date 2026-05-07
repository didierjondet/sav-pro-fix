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

/**
 * Renvoie une base URL publique adaptée pour les liens envoyés en SMS/email.
 * Sur preview/lovable, on force fixway.fr ; sur custom domain on garde l'origin.
 */
export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return 'https://fixway.fr';
  const host = window.location.hostname;
  if (host.includes('lovable.app') || host.includes('lovableproject.com') || host === 'localhost' || host.startsWith('127.')) {
    return 'https://fixway.fr';
  }
  return window.location.origin;
}

export function generatePublicQuoteUrl(quoteId: string): string {
  return `${getPublicBaseUrl()}/quote/${quoteId}`;
}

export function generatePublicAppointmentUrl(token: string): string {
  return `${getPublicBaseUrl()}/rdv/${token}`;
}