/** Règle des fichiers envoyables depuis le téléphone (miroir dans l'edge function mobile-sav-upload). */
export const MOBILE_UPLOAD_TYPES: Record<string, { ext: string; maxBytes: number }> = {
  'image/jpeg': { ext: 'jpg', maxBytes: 5 * 1024 * 1024 },
  'image/png': { ext: 'png', maxBytes: 5 * 1024 * 1024 },
  'image/webp': { ext: 'webp', maxBytes: 5 * 1024 * 1024 },
  'application/pdf': { ext: 'pdf', maxBytes: 10 * 1024 * 1024 },
};

export function checkMobileUpload(mime: string, size: number): { ok: true } | { ok: false; error: string } {
  const rule = MOBILE_UPLOAD_TYPES[mime];
  if (!rule) return { ok: false, error: 'Format non accepté (photo JPG, PNG, WebP ou PDF)' };
  if (size > rule.maxBytes) return { ok: false, error: mime === 'application/pdf' ? 'PDF trop lourd (10 Mo max)' : 'Photo trop lourde (5 Mo max)' };
  return { ok: true };
}

/** Ajoute les nouveaux chemins reçus sans doublon. */
export function mergeAttachments(current: string[], incoming: unknown): string[] {
  const list = Array.isArray(incoming) ? incoming.filter((p): p is string => typeof p === 'string') : [];
  return [...current, ...list.filter((p) => !current.includes(p))];
}
