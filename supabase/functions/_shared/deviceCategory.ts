// Miroir exact de src/hooks/useStatistics.ts → categorizeDevice
// Utilisé par le help-bot pour reproduire la catégorisation du widget
// "Répartition du chiffre d'affaires".

export type ProductCategory = 'Téléphones' | 'Informatique' | 'Consoles' | 'Tablettes' | 'Autres';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Téléphones',
  'Informatique',
  'Consoles',
  'Tablettes',
  'Autres',
];

export function categorizeDevice(brand: string, model: string): ProductCategory {
  const brandUpper = (brand || '').toUpperCase().trim();
  const modelUpper = (model || '').toUpperCase().trim();
  const combined = `${brandUpper} ${modelUpper}`;

  // ===== CONSOLES DE JEUX =====
  if (['MICROSOFT', 'XBOX', 'NINTENDO'].includes(brandUpper)) return 'Consoles';
  if (brandUpper === 'SONY' && (modelUpper.includes('PS') || modelUpper.includes('PLAYSTATION') || modelUpper.includes('DUALSENSE') || modelUpper.includes('DUALSHOCK'))) {
    return 'Consoles';
  }
  if (combined.match(/PS[345]|XBOX|SWITCH|NINTENDO|PLAYSTATION|CONSOLE|MANETTE|DUALSENSE|DUALSHOCK|JOY-?CON/i)) {
    return 'Consoles';
  }

  // ===== INFORMATIQUE =====
  const pcBrands = ['TOSHIBA', 'HP', 'LENOVO', 'DELL', 'ASUS', 'ACER', 'MSI', 'GIGABYTE', 'RAZER',
                    'CORSAIR', 'LOGITECH', 'COOLER MASTER', 'NZXT', 'THERMALTAKE', 'OMEN', 'ALIENWARE',
                    'PREDATOR', 'REPUBLIC OF GAMERS', 'ROG', 'STEELSERIES', 'HYPERX', 'ROCCAT',
                    'EVGA', 'ZOTAC', 'SAPPHIRE', 'ASROCK', 'BIOSTAR', 'PALIT', 'PNY', 'INNO3D'];
  if (pcBrands.includes(brandUpper)) return 'Informatique';
  if (modelUpper.match(/MACBOOK|IMAC|MAC MINI|MAC PRO|MAC STUDIO/)) return 'Informatique';
  if (combined.match(/PC|LAPTOP|NOTEBOOK|TOUR|GAMER|PROBOOK|IDEAPAD|VIVOBOOK|THINKPAD|PAVILION|INSPIRON|ORDINATEUR|DESKTOP|CLAVIER|SOURIS|ECRAN|MONITEUR|CARTE GRAPHIQUE|GPU|CPU|PROCESSEUR|RAM|SSD|HDD|DISQUE DUR|ALIMENTATION|BOITIER|VENTILATEUR|WATERCOOLING|GAMING PC|TOUR GAMER|STATION|WORKSTATION/i)) {
    return 'Informatique';
  }

  // ===== TABLETTES =====
  if (modelUpper.match(/IPAD|GALAXY TAB|TAB S\d|TAB A\d|SURFACE|TABLETTE|MEDIAPAD|MATEPAD/i)) return 'Tablettes';

  // ===== TÉLÉPHONES =====
  const phoneBrands = ['APPLE', 'SAMSUNG', 'HUAWEI', 'XIAOMI', 'OPPO', 'GOOGLE', 'ONEPLUS',
                       'HONOR', 'REALME', 'VIVO', 'MOTOROLA', 'NOKIA', 'LG', 'WIKO', 'FAIRPHONE',
                       'NOTHING', 'POCO', 'REDMI', 'INFINIX', 'TECNO', 'ZTE', 'ALCATEL', 'DORO',
                       'CROSSCALL', 'BLACKVIEW', 'CUBOT', 'UMIDIGI', 'OUKITEL'];

  if (brandUpper === 'ONE' || brandUpper === 'ONEPLUS' || combined.includes('ONEPLUS')) {
    return 'Téléphones';
  }
  if (modelUpper.match(/IPHONE|^[0-9]+ PRO|^XS|^XR|^X$|^SE$|^MINI$|^PRO MAX$/i)) {
    if (brandUpper === 'APPLE' || brandUpper === '') return 'Téléphones';
  }
  if (brandUpper === 'SAMSUNG') {
    if (modelUpper.match(/TAB|TABLETTE/i)) return 'Tablettes';
    if (modelUpper.match(/GALAXY|^S\d|^A\d|^M\d|^F\d|^Z FOLD|^Z FLIP|NOTE|ULTRA/i)) return 'Téléphones';
  }
  if (phoneBrands.includes(brandUpper)) {
    if (!modelUpper.match(/MACBOOK|IMAC|IPAD|TAB|PC|LAPTOP/i)) return 'Téléphones';
  }
  if (modelUpper.match(/GALAXY S|GALAXY A|GALAXY M|GALAXY Z|REDMI|PIXEL|MATE|XPERIA|PHONE|SMARTPHONE|POCO|FIND X|RENO|MI \d|NOTE \d/i)) {
    return 'Téléphones';
  }

  return 'Autres';
}
