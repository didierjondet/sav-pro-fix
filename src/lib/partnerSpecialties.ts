/** Catalogue des spécialités proposées aux fiches partenaires. */
export const PARTNER_SPECIALTIES: string[] = [
  'Micro-soudure',
  'Écrans',
  'Batteries',
  'Connecteurs de charge',
  'Désoxydation',
  'Récupération de données',
  'Déblocage / logiciel',
  'Smartphones',
  'Tablettes',
  'Consoles de jeux',
  'Informatique / PC',
  'Apple / macOS',
  'Objets connectés',
  'Drones',
  'Électroménager',
  'Rachat / reconditionnement',
];

/** Normalise les spécialités d'une fiche (tags structurés + ancien champ texte). */
export function resolveSpecialtyTags(
  tags?: string[] | null,
  legacyText?: string | null,
): string[] {
  if (tags && tags.length > 0) return tags;
  if (!legacyText) return [];
  return legacyText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
