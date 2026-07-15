/**
 * Base de connaissances imprimantes étiquettes.
 * Source : fiches techniques constructeurs (Epson, Brother, Zebra, DYMO).
 *
 * Sert à :
 *  - alimenter le sélecteur des réglages d'étiquettes SAV,
 *  - appliquer des presets fiables (largeur imprimable réelle, marge de sécurité, rotation, DPI),
 *  - afficher une fiche d'aide (notes driver + navigateur) contextualisée au modèle choisi.
 *
 * Rien n'est côté serveur : c'est purement statique.
 */

export type PrintMethod = 'thermal-direct' | 'thermal-transfer' | 'inkjet';

export interface LabelMedia {
  id: string;
  /** Largeur physique du support en mm (rouleau) */
  widthMm: number;
  /** Hauteur d'une étiquette en mm */
  heightMm: number;
  /** Espacement physique entre 2 étiquettes (gap die-cut), en mm */
  gapMm: number;
  /** Description commerciale */
  description: string;
  /** Marque cette référence comme celle appliquée par défaut si le modèle est sélectionné */
  isDefault?: boolean;
}

export interface LabelPrinterSpec {
  id: string;
  brand: string;
  model: string;
  productUrl: string;
  printMethod: PrintMethod;
  /** Résolution native de l'imprimante en DPI */
  dpi: number;
  /** Largeur imprimable maximale en mm (≠ largeur du rouleau) */
  maxPrintWidthMm: number;
  /** Marge interne recommandée en mm pour éviter les sauts d'étiquette */
  safetyMarginMm: number;
  /** Rotation par défaut à appliquer au contenu (dépend du sens de sortie du rouleau) */
  defaultRotationDeg: 0 | 90 | 180 | 270;
  /** Nom d'imprimante tel qu'il apparaît généralement dans Windows */
  suggestedWindowsName: string;
  /** Étiquettes/consommables couramment utilisés avec ce modèle */
  recommendedMedia: LabelMedia[];
  /** Rappels côté pilote Windows/Mac */
  driverNotes: string[];
  /** Rappels côté navigateur (boîte d'impression Chrome/Edge) */
  browserNotes: string[];
}

export const LABEL_PRINTERS: LabelPrinterSpec[] = [
  {
    id: 'epson-tm-l90',
    brand: 'Epson',
    model: 'TM-L90 (étiquette)',
    productUrl: 'https://www.epson.fr/fr_FR/produits/systemes-transactionnels/imprimantes-thermiques/tm-l90/p/12153',
    printMethod: 'thermal-direct',
    dpi: 203,
    maxPrintWidthMm: 56,
    safetyMarginMm: 0.5,
    defaultRotationDeg: 90,
    suggestedWindowsName: 'EPSON TM-L90 Label',
    recommendedMedia: [
      { id: 'tm-l90-55x40', widthMm: 55, heightMm: 40, gapMm: 3, description: '55×40 mm die-cut (référence terrain)', isDefault: true },
      { id: 'tm-l90-58x40', widthMm: 58, heightMm: 40, gapMm: 3, description: '58×40 mm die-cut' },
      { id: 'tm-l90-76x50', widthMm: 76, heightMm: 50, gapMm: 3, description: '76×50 mm die-cut (grand format)' },
    ],
    driverNotes: [
      'Utiliser le pilote APD (Advanced Printer Driver) Epson officiel, pas le pilote générique Windows.',
      'Onglet Document / Media : Type = « Die-cut label » (étiquette prédécoupée).',
      'Onglet Paper : régler la taille au format exact du rouleau (55×40, 58×40, etc.).',
      'Onglet Options : cocher « Reduce top margin » pour éviter le saut d\'étiquette vide.',
      'Vitesse d\'impression : 90 mm/s (défaut). Baisser à 60 mm/s si les bords sont pâles.',
      'Densité : Medium par défaut ; Dark si le rendu est trop clair.',
    ],
    browserNotes: [
      'Marges : Aucune (None).',
      'Mise à l\'échelle : 100 % — surtout PAS « Ajuster à la page ».',
      'En-têtes / pieds de page : décochés.',
      'Ne pas changer l\'orientation ici : utiliser le bouton Rotation dans les réglages Fixway.',
    ],
  },
  {
    id: 'epson-tm-l100',
    brand: 'Epson',
    model: 'TM-L100',
    productUrl: 'https://www.epson.fr/fr_FR/produits/systemes-transactionnels/imprimantes-thermiques/tm-l100/p/26063',
    printMethod: 'thermal-direct',
    dpi: 203,
    maxPrintWidthMm: 72,
    safetyMarginMm: 0.5,
    defaultRotationDeg: 0,
    suggestedWindowsName: 'EPSON TM-L100',
    recommendedMedia: [
      { id: 'tm-l100-58x40', widthMm: 58, heightMm: 40, gapMm: 3, description: '58×40 mm die-cut', isDefault: true },
      { id: 'tm-l100-76x50', widthMm: 76, heightMm: 50, gapMm: 3, description: '76×50 mm die-cut' },
    ],
    driverNotes: [
      'Installer le pilote APD Epson officiel.',
      'Media type : Die-cut label.',
      'Activer « Reduce top margin » pour éviter le blanc en tête.',
    ],
    browserNotes: [
      'Marges : Aucune, échelle 100 %, en-têtes désactivés.',
    ],
  },
  {
    id: 'brother-ql-820',
    brand: 'Brother',
    model: 'QL-820NWB',
    productUrl: 'https://www.brother.fr/etiqueteuses/imprimantes-etiquettes/ql-820nwb',
    printMethod: 'thermal-direct',
    dpi: 300,
    maxPrintWidthMm: 62,
    safetyMarginMm: 1,
    defaultRotationDeg: 0,
    suggestedWindowsName: 'Brother QL-820NWB',
    recommendedMedia: [
      { id: 'brother-dk-11209', widthMm: 62, heightMm: 29, gapMm: 3, description: 'DK-11209 — 62×29 mm (adresse S)', isDefault: true },
      { id: 'brother-dk-11201', widthMm: 90, heightMm: 29, gapMm: 3, description: 'DK-11201 — 90×29 mm (adresse standard)' },
      { id: 'brother-dk-11202', widthMm: 100, heightMm: 62, gapMm: 3, description: 'DK-11202 — 100×62 mm (expédition)' },
    ],
    driverNotes: [
      'Pilote Brother P-touch / QL officiel requis.',
      'Sélectionner la référence DK exacte du rouleau installé.',
      'Activer « High resolution » si le texte est peu lisible.',
    ],
    browserNotes: [
      'Marges : Aucune, échelle 100 %.',
      'Choisir la taille de papier correspondant au DK monté.',
    ],
  },
  {
    id: 'brother-ql-800',
    brand: 'Brother',
    model: 'QL-800',
    productUrl: 'https://www.brother.fr/etiqueteuses/imprimantes-etiquettes/ql-800',
    printMethod: 'thermal-direct',
    dpi: 300,
    maxPrintWidthMm: 62,
    safetyMarginMm: 1,
    defaultRotationDeg: 0,
    suggestedWindowsName: 'Brother QL-800',
    recommendedMedia: [
      { id: 'brother-dk-11209-b', widthMm: 62, heightMm: 29, gapMm: 3, description: 'DK-11209 — 62×29 mm', isDefault: true },
      { id: 'brother-dk-11201-b', widthMm: 90, heightMm: 29, gapMm: 3, description: 'DK-11201 — 90×29 mm' },
    ],
    driverNotes: [
      'Pilote officiel Brother QL requis.',
      'Choisir la référence DK exacte.',
    ],
    browserNotes: [
      'Marges : Aucune, échelle 100 %.',
    ],
  },
  {
    id: 'zebra-zd421',
    brand: 'Zebra',
    model: 'ZD421',
    productUrl: 'https://www.zebra.com/fr/fr/products/printers/desktop/zd421.html',
    printMethod: 'thermal-direct',
    dpi: 203,
    maxPrintWidthMm: 104,
    safetyMarginMm: 1,
    defaultRotationDeg: 0,
    suggestedWindowsName: 'ZDesigner ZD421',
    recommendedMedia: [
      { id: 'zebra-57x32', widthMm: 57, heightMm: 32, gapMm: 3, description: '57×32 mm die-cut', isDefault: true },
      { id: 'zebra-102x51', widthMm: 102, heightMm: 51, gapMm: 3, description: '102×51 mm die-cut' },
    ],
    driverNotes: [
      'Utiliser le pilote ZDesigner (Zebra Setup Utilities).',
      'Lancer une calibration média avant la 1re impression sur un rouleau neuf.',
      'Type de média : Labels with gaps (die-cut).',
    ],
    browserNotes: [
      'Marges : Aucune, échelle 100 %.',
    ],
  },
  {
    id: 'zebra-zd220',
    brand: 'Zebra',
    model: 'ZD220',
    productUrl: 'https://www.zebra.com/fr/fr/products/printers/desktop/value-desktop/zd220.html',
    printMethod: 'thermal-direct',
    dpi: 203,
    maxPrintWidthMm: 104,
    safetyMarginMm: 1,
    defaultRotationDeg: 0,
    suggestedWindowsName: 'ZDesigner ZD220',
    recommendedMedia: [
      { id: 'zd220-57x32', widthMm: 57, heightMm: 32, gapMm: 3, description: '57×32 mm die-cut', isDefault: true },
    ],
    driverNotes: [
      'Pilote ZDesigner officiel.',
      'Calibration média obligatoire au 1er montage de rouleau.',
    ],
    browserNotes: [
      'Marges : Aucune, échelle 100 %.',
    ],
  },
  {
    id: 'dymo-lw-550',
    brand: 'DYMO',
    model: 'LabelWriter 550',
    productUrl: 'https://www.dymo.com/labelwriter-550-label-printer/2112552.html',
    printMethod: 'thermal-direct',
    dpi: 300,
    maxPrintWidthMm: 56,
    safetyMarginMm: 1,
    defaultRotationDeg: 0,
    suggestedWindowsName: 'DYMO LabelWriter 550',
    recommendedMedia: [
      { id: 'dymo-11352', widthMm: 54, heightMm: 25, gapMm: 3, description: 'S0722520 — 54×25 mm (retour)', isDefault: true },
      { id: 'dymo-99012', widthMm: 89, heightMm: 36, gapMm: 3, description: '99012 — 89×36 mm (adresse)' },
    ],
    driverNotes: [
      'Pilote DYMO Connect officiel.',
      'Depuis la LW 550, seuls les rouleaux DYMO authentiques (RFID) sont acceptés.',
    ],
    browserNotes: [
      'Marges : Aucune, échelle 100 %.',
    ],
  },
  {
    id: 'dymo-lw-450',
    brand: 'DYMO',
    model: 'LabelWriter 450',
    productUrl: 'https://www.dymo.com/labelwriter-450-label-printer/SD0947340.html',
    printMethod: 'thermal-direct',
    dpi: 300,
    maxPrintWidthMm: 56,
    safetyMarginMm: 1,
    defaultRotationDeg: 0,
    suggestedWindowsName: 'DYMO LabelWriter 450',
    recommendedMedia: [
      { id: 'dymo-11352-450', widthMm: 54, heightMm: 25, gapMm: 3, description: '11352 — 54×25 mm', isDefault: true },
      { id: 'dymo-99012-450', widthMm: 89, heightMm: 36, gapMm: 3, description: '99012 — 89×36 mm' },
    ],
    driverNotes: [
      'Pilote DYMO Label Software v8 recommandé.',
    ],
    browserNotes: [
      'Marges : Aucune, échelle 100 %.',
    ],
  },
  {
    id: 'generic-60x40',
    brand: 'Générique',
    model: 'Imprimante étiquette 60×40 mm',
    productUrl: '',
    printMethod: 'thermal-direct',
    dpi: 203,
    maxPrintWidthMm: 60,
    safetyMarginMm: 1,
    defaultRotationDeg: 0,
    suggestedWindowsName: '',
    recommendedMedia: [
      { id: 'gen-60x40', widthMm: 60, heightMm: 40, gapMm: 3, description: '60×40 mm (défaut)', isDefault: true },
    ],
    driverNotes: [
      'Installer le pilote fourni par le constructeur.',
      'Vérifier la largeur imprimable réelle dans la doc de l\'imprimante.',
    ],
    browserNotes: [
      'Marges : Aucune, échelle 100 %.',
    ],
  },
];

export const DEFAULT_PRINTER_ID = 'epson-tm-l90';

export function findPrinterSpec(id: string): LabelPrinterSpec | undefined {
  return LABEL_PRINTERS.find((p) => p.id === id);
}

export function findDefaultMedia(spec: LabelPrinterSpec): LabelMedia {
  return spec.recommendedMedia.find((m) => m.isDefault) || spec.recommendedMedia[0];
}
