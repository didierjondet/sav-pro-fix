// Adresse de retour des connexions / e-mails : toujours un domaine Fixway, jamais Lovable.
export const AUTH_BASE_URL = 'https://fixway.fr';
const ALLOWED_HOSTS = ['fixway.fr', 'www.fixway.fr', 'logicielsav.com', 'www.logicielsav.com'];

export function getAuthBaseUrl(): string {
  if (typeof window !== 'undefined' && ALLOWED_HOSTS.includes(window.location.hostname)) {
    return window.location.origin;
  }
  return AUTH_BASE_URL;
}

/** Construit une URL de retour sûre ; seuls les chemins internes sont acceptés. */
export function authRedirectUrl(path: string): string {
  const safe = path.startsWith('/') && !path.startsWith('//') ? path : '/';
  return `${getAuthBaseUrl()}${safe}`;
}
