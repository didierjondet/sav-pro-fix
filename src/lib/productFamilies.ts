import { categorizeDevice, normalizeText, type ProductCategory } from '@/lib/deviceCategorization';

export interface FamilyLite { id: string; name: string; is_active?: boolean }

export const DEFAULT_PRODUCT_FAMILIES: { name: string; color: string }[] = [
  { name: 'Téléphones', color: '#3B82F6' },
  { name: 'Tablettes', color: '#06B6D4' },
  { name: 'Informatique', color: '#8B5CF6' },
  { name: 'Consoles', color: '#10B981' },
  { name: 'Autres', color: '#6B7280' },
];

// Mots-clés acceptés dans le nom d'une famille pour chaque catégorie détectée.
const CATEGORY_KEYWORDS: Record<ProductCategory, string[]> = {
  'Téléphones': ['TELEPHONE', 'SMARTPHONE', 'MOBILE', 'PHONE', 'GSM'],
  'Tablettes': ['TABLETTE', 'TABLET', 'IPAD'],
  'Informatique': ['INFORMATIQUE', 'ORDINATEUR', 'PC', 'LAPTOP', 'PORTABLE'],
  'Consoles': ['CONSOLE', 'MANETTE', 'GAMING', 'JEU'],
  'Autres': ['AUTRE', 'DIVERS'],
};

/** Retourne la famille du magasin correspondant à la catégorie détectée localement,
 *  ou null si aucune famille ne correspond (ou si la catégorie est « Autres » : on laisse l'IA trancher). */
export function matchFamilyForDevice(
  families: FamilyLite[],
  brand: string,
  model: string,
): { familyId: string | null; category: ProductCategory } {
  const category = categorizeDevice(brand, model);
  const active = families.filter((f) => f.is_active !== false);
  const keywords = CATEGORY_KEYWORDS[category];
  const found = active.find((f) => {
    const n = normalizeText(f.name);
    return keywords.some((k) => n.split(' ').some((w) => w.startsWith(k)));
  });
  return { familyId: category === 'Autres' ? null : found?.id ?? null, category };
}

export function findOtherFamily(families: FamilyLite[]): string | null {
  const f = families.find((x) => x.is_active !== false && CATEGORY_KEYWORDS['Autres'].some((k) => normalizeText(x.name).startsWith(k)));
  return f?.id ?? null;
}
