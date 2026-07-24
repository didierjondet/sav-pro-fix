// Miroir de src/lib/deviceCategorization.ts pour les edge functions
// (help-bot, classify-sav-category). Toute modification doit être répliquée
// dans les DEUX fichiers pour garder les statistiques et le help-bot alignés.

export type ProductCategory = 'Téléphones' | 'Informatique' | 'Consoles' | 'Tablettes' | 'Autres';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Téléphones', 'Informatique', 'Consoles', 'Tablettes', 'Autres',
];

export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9+\s]/g, ' ')
    .replace(/\b\d{7,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BRAND_ALIASES: Record<string, string> = {
  APP: 'APPLE', APPL: 'APPLE', APLE: 'APPLE', APPLR: 'APPLE', IPHONE: 'APPLE',
  IPAD: 'APPLE', MACBOOK: 'APPLE',
  SAMASUNG: 'SAMSUNG', SASMUNG: 'SAMSUNG', SAMSNUG: 'SAMSUNG', SAMSNG: 'SAMSUNG',
  SUMSUNG: 'SAMSUNG', SANSUNG: 'SAMSUNG', SAMUSNG: 'SAMSUNG',
  HAUWEI: 'HUAWEI', HUWAEI: 'HUAWEI', HUAWAI: 'HUAWEI',
  XIOMI: 'XIAOMI', XAOMI: 'XIAOMI', XIAMI: 'XIAOMI',
  REDMII: 'REDMI',
  ONE: 'ONEPLUS', ONEPLU: 'ONEPLUS',
};

const PHONE_BRANDS = [
  'APPLE', 'SAMSUNG', 'HUAWEI', 'XIAOMI', 'OPPO', 'GOOGLE', 'ONEPLUS',
  'HONOR', 'REALME', 'VIVO', 'MOTOROLA', 'NOKIA', 'LG', 'WIKO', 'FAIRPHONE',
  'NOTHING', 'POCO', 'REDMI', 'INFINIX', 'TECNO', 'ZTE', 'ALCATEL', 'DORO',
  'CROSSCALL', 'BLACKVIEW', 'CUBOT', 'UMIDIGI', 'OUKITEL',
];

const PC_BRANDS = [
  'TOSHIBA', 'HP', 'LENOVO', 'DELL', 'ASUS', 'ACER', 'MSI', 'GIGABYTE', 'RAZER',
  'CORSAIR', 'LOGITECH', 'COOLER MASTER', 'NZXT', 'THERMALTAKE', 'OMEN', 'ALIENWARE',
  'PREDATOR', 'REPUBLIC OF GAMERS', 'ROG', 'STEELSERIES', 'HYPERX', 'ROCCAT',
  'EVGA', 'ZOTAC', 'SAPPHIRE', 'ASROCK', 'BIOSTAR', 'PALIT', 'PNY', 'INNO3D',
];

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  const m = a.length, n = b.length;
  const prev = new Array(n + 1), cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}

export function resolveBrand(rawBrand: string): string {
  const norm = normalizeText(rawBrand);
  if (!norm) return '';
  if (BRAND_ALIASES[norm]) return BRAND_ALIASES[norm];
  const firstWord = norm.split(' ')[0];
  if (BRAND_ALIASES[firstWord]) return BRAND_ALIASES[firstWord];
  const known = [...PHONE_BRANDS, ...PC_BRANDS];
  if (known.includes(norm)) return norm;
  if (norm.length >= 5) {
    let best = { brand: '', d: 3 };
    for (const b of known) {
      if (Math.abs(b.length - norm.length) > 2) continue;
      const d = levenshtein(norm, b);
      if (d < best.d) best = { brand: b, d };
    }
    if (best.brand) return best.brand;
  }
  return norm;
}

const CONSOLE_RE = /\bPS[345]\b|XBOX|SWITCH|JOY.?CON|DUALSENSE|DUALSHOCK|MANETTE|NINTENDO|PLAYSTATION/;
const TABLET_RE = /\bIPAD\b|GALAXY TAB|TAB S\d|TAB A\d|SURFACE|MEDIAPAD|MATEPAD|TABLETTE/;
const COMPUTER_RE = /\bPC\b|LAPTOP|NOTEBOOK|MACBOOK|IMAC|MAC MINI|MAC STUDIO|PROBOOK|IDEAPAD|VIVOBOOK|THINKPAD|PAVILION|INSPIRON|LATITUDE|XPS|SWIFT|PREDATOR|OMEN|TUF|ROG\b|LOQ\b|ASPIRE|ORDINATEUR|DESKTOP|WORKSTATION|GAMING PC|TOUR GAMER|\bSSD\b|\bHDD\b|\bRAM\b|\bGPU\b|\bCPU\b/;
const PHONE_MODEL_RE = /IPHONE|GALAXY [SAMFZ]\d|REDMI|PIXEL|\bMATE\b|XPERIA|SMARTPHONE|\bPOCO\b|FIND X|\bRENO\b|ONEPLUS|\bNORD\b|Z ?FLIP|Z ?FOLD/;
const APPLE_MODEL_RE = /^\d{1,2}(\s|$)|\d{1,2}\s?(PRO(\s|$)|PRO MAX|MINI|PLUS|\+)|^XS|^XR|^SE\b/;
const SAMSUNG_MODEL_RE = /^[SAMFZ]\s?\d{1,2}(\s|FE|ULTRA|PLUS|\+|$)/;

export function categorizeDevice(rawBrand: string, rawModel: string): ProductCategory {
  const nBrand = normalizeText(rawBrand);
  const nModel = normalizeText(rawModel);
  const resolvedBrand = resolveBrand(rawBrand);
  const combined = `${resolvedBrand} ${nModel} ${nBrand}`.trim();

  if (['MICROSOFT', 'XBOX', 'NINTENDO'].includes(resolvedBrand)) return 'Consoles';
  if (resolvedBrand === 'SONY' && /PS|PLAYSTATION|DUALSENSE|DUALSHOCK/.test(nModel)) return 'Consoles';
  if (CONSOLE_RE.test(combined)) return 'Consoles';

  if (TABLET_RE.test(combined)) return 'Tablettes';

  if (PC_BRANDS.includes(resolvedBrand)) return 'Informatique';
  if (COMPUTER_RE.test(combined)) return 'Informatique';

  if (PHONE_BRANDS.includes(resolvedBrand)) {
    if (resolvedBrand === 'SAMSUNG' && /TAB|TABLETTE/.test(nModel)) return 'Tablettes';
    return 'Téléphones';
  }

  if (PHONE_MODEL_RE.test(combined)) return 'Téléphones';

  const appleContext = resolvedBrand === 'APPLE' || nBrand === '' || /APPLE|IPHONE/.test(nBrand) || /APPLE|IPHONE/.test(nModel);
  if (appleContext && APPLE_MODEL_RE.test(nModel)) return 'Téléphones';
  if (appleContext && APPLE_MODEL_RE.test(nBrand)) return 'Téléphones';

  if (!PC_BRANDS.includes(resolvedBrand) && SAMSUNG_MODEL_RE.test(nModel)) return 'Téléphones';

  return 'Autres';
}
