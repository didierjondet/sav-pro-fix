// Calcul du taux de retour produit (réparations récurrentes sur un même appareil).
// Une "réparation" = un SAV. Un "retour" = un SAV dont un SAV précédent du même
// produit existe (peu importe le délai). On distingue retour "même panne" vs "autre panne"
// par recouvrement de mots-clés significatifs sur le problem_description.

export interface ProductCaseInput {
  id: string;
  created_at: string;
  problem_description?: string | null;
  status?: string | null;
}

export interface ReturnRateResult {
  totalCases: number;
  returnCount: number;
  sameIssueCount: number;
  otherIssueCount: number;
  /** % de SAV qui sont des retours (returnCount / totalCases) */
  returnRate: number;
  /** % de SAV qui sont des retours pour la même panne */
  sameIssueRate: number;
  /** classification par id : 'first' | 'same' | 'other' */
  classification: Record<string, 'first' | 'same' | 'other'>;
}

const STOPWORDS = new Set([
  'avec','sans','pour','dans','plus','moins','tres','etre','cette','cela','mais','donc',
  'apres','avant','vers','chez','sous','entre','leur','leurs','elle','elles','nous','vous',
  'mon','ton','son','mes','tes','ses','nos','vos','les','des','une','aux','par','que','qui',
  'est','sont','etait','etaient','fait','faite','faits','faites','pas','peu','beaucoup',
  'probleme','problemes','panne','pannes','client','dit','dite','ok','non','oui',
  'appareil','telephone','phone','smartphone','iphone','samsung','tablet','tablette',
]);

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (s?: string | null): Set<string> => {
  if (!s) return new Set();
  return new Set(
    normalize(s)
      .split(' ')
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  );
};

const shareIssue = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size === 0 || b.size === 0) return false;
  for (const t of a) if (b.has(t)) return true;
  return false;
};

export function computeReturnRate(cases: ProductCaseInput[]): ReturnRateResult {
  const classification: Record<string, 'first' | 'same' | 'other'> = {};
  const totalCases = cases.length;

  // tri chronologique ascendant
  const sorted = [...cases].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const tokensByIdx = sorted.map((c) => tokenize(c.problem_description));

  let returnCount = 0;
  let sameIssueCount = 0;

  sorted.forEach((c, idx) => {
    if (idx === 0) {
      classification[c.id] = 'first';
      return;
    }
    returnCount++;
    const myTokens = tokensByIdx[idx];
    let same = false;
    for (let j = 0; j < idx; j++) {
      if (shareIssue(myTokens, tokensByIdx[j])) {
        same = true;
        break;
      }
    }
    if (same) {
      sameIssueCount++;
      classification[c.id] = 'same';
    } else {
      classification[c.id] = 'other';
    }
  });

  const otherIssueCount = returnCount - sameIssueCount;
  const returnRate = totalCases > 0 ? (returnCount / totalCases) * 100 : 0;
  const sameIssueRate = totalCases > 0 ? (sameIssueCount / totalCases) * 100 : 0;

  return {
    totalCases,
    returnCount,
    sameIssueCount,
    otherIssueCount,
    returnRate,
    sameIssueRate,
    classification,
  };
}
