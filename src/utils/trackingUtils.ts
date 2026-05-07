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
 * Renvoie un host public sans schéma (ex: "fixway.fr") pour les liens SMS.
 * Le schéma https:// + UUID long déclenche les filtres anti-spam SMS (Brevo).
 * Les clients SMS rendent quand même le lien cliquable sans le schéma.
 */
export function getPublicSmsHost(): string {
  if (typeof window === 'undefined') return 'fixway.fr';
  const host = window.location.hostname;
  if (host.includes('lovable.app') || host.includes('lovableproject.com') || host === 'localhost' || host.startsWith('127.')) {
    return 'fixway.fr';
  }
  return host;
}

export function generatePublicQuoteUrl(quoteId: string): string {
  return `${getPublicSmsHost()}/quote/${quoteId}`;
}

export function generatePublicAppointmentUrl(token: string): string {
  return `${getPublicSmsHost()}/rdv/${token}`;
}