/** Règles du parcours de saisie SAV sur smartphone. */

export const MOBILE_SAV_SESSION_MINUTES = 15;

/** IMEI valide : 15 chiffres avec clé de Luhn correcte. */
export function isValidImei(value: string | null | undefined): boolean {
  const v = (value || '').replace(/\s/g, '');
  if (!/^\d{15}$/.test(v)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(v[i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export interface MobileSessionLike {
  status: string;
  expires_at: string;
}

/** Une session est utilisable si elle n'est ni soumise, ni expirée. */
export function isMobileSessionUsable(s: MobileSessionLike | null | undefined, now: Date = new Date()): boolean {
  if (!s) return false;
  if (s.status === 'submitted' || s.status === 'expired') return false;
  return new Date(s.expires_at).getTime() > now.getTime();
}

/** Pièces pré-filtrées sur la marque et le modèle de l'appareil. */
export function filterPartsForDevice<T extends { name: string; reference?: string | null; sku?: string | null }>(
  parts: T[], brand: string, model: string,
): T[] {
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = norm(`${model}`).split(/\s+/).filter((w) => w.length > 0);
  const b = norm(brand).trim();
  if (words.length === 0 && !b) return [];
  return parts.filter((p) => {
    const hay = norm(`${p.name} ${p.reference || ''} ${p.sku || ''}`);
    if (words.length > 0) return words.every((w) => hay.includes(w));
    return hay.includes(b);
  });
}
