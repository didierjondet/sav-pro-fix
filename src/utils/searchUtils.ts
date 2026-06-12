/**
 * Utility function for multi-word search functionality
 * Splits search terms by spaces and checks if ALL words are found in the target text
 */
export const multiWordSearch = (searchTerm: string, ...targetTexts: (string | undefined | null)[]): boolean => {
  if (!searchTerm.trim()) return true;
  
  // Split search term into individual words and filter out empty strings
  const searchWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0);
  
  // Combine all target texts into one searchable string, filtering out null/undefined values
  const combinedText = targetTexts
    .filter((text): text is string => text != null && text !== undefined)
    .join(' ')
    .toLowerCase();
  
  // Check if ALL search words are found in the combined text
  return searchWords.every(word => combinedText.includes(word));
};

/** Normalize a string: lowercase + remove accents/diacritics. */
const normalize = (s: string | undefined | null): string =>
  (s ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Score a part-like record against a multi-word search term.
 * Higher = more relevant. Returns -1 when at least one search word is found nowhere
 * (the row should be excluded — same behavior as multiWordSearch).
 *
 * Field weights:
 *  - exact name match              → 1000
 *  - name starts with full query   → 500
 *  - all words in name (bonus)     → +100
 *  - per word at token start in name → +50
 *  - per word present in name      → +20
 *  - per word in reference/sku     → +10
 *  - per word in supplier/notes    → +2
 */
export interface PartLikeForSearch {
  name?: string | null;
  reference?: string | null;
  sku?: string | null;
  supplier?: string | null;
  notes?: string | null;
}

export const scorePartRelevance = (searchTerm: string, part: PartLikeForSearch): number => {
  const q = normalize(searchTerm).trim();
  if (!q) return 0;

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const name = normalize(part.name);
  const reference = normalize(part.reference);
  const sku = normalize(part.sku);
  const supplier = normalize(part.supplier);
  const notes = normalize(part.notes);
  const combined = [name, reference, sku, supplier, notes].join(' ');

  // Exclusion: every word must appear somewhere
  for (const w of words) {
    if (!combined.includes(w)) return -1;
  }

  let score = 0;
  if (name === q) score += 1000;
  if (name.startsWith(q)) score += 500;

  const nameTokens = name.split(/[\s\-_/.,()]+/).filter(Boolean);
  let allWordsInName = true;
  for (const w of words) {
    const inName = name.includes(w);
    if (!inName) allWordsInName = false;
    if (inName) score += 20;
    if (nameTokens.some((t) => t.startsWith(w))) score += 50;
    if (reference.includes(w) || sku.includes(w)) score += 10;
    if (supplier.includes(w) || notes.includes(w)) score += 2;
  }
  if (allWordsInName) score += 100;

  return score;
};

/**
 * Filter + rank an array of part-like records by relevance to the search term.
 * Items with score < 0 are excluded. Ties broken alphabetically by name.
 * Returns the original list (unchanged order) when the search term is empty.
 */
export function searchAndRankParts<T extends PartLikeForSearch>(searchTerm: string, parts: T[]): T[] {
  if (!searchTerm.trim()) return parts;
  const scored: Array<{ part: T; score: number }> = [];
  for (const p of parts) {
    const score = scorePartRelevance(searchTerm, p);
    if (score >= 0) scored.push({ part: p, score });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return normalize(a.part.name).localeCompare(normalize(b.part.name));
  });
  return scored.map((s) => s.part);
}
