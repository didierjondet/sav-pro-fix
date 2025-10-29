/**
 * Utilitaires pour l'import/export de données
 * Détection automatique du format Fixway et mapping flexible des colonnes
 */

// En-têtes standardisés des exports Fixway
export const FIXWAY_STOCK_HEADERS = [
  'Nom', 'Référence', 'Quantité', 'Stock minimum', 
  'Prix achat (€)', 'Prix vente (€)', 'Fournisseur', 'Notes', 'Temps (min)'
];

export const FIXWAY_CUSTOMER_HEADERS = [
  'Prénom', 'Nom', 'Email', 'Téléphone', 'Adresse'
];

export const FIXWAY_QUOTE_HEADERS = [
  'Numéro', 'Client (nom complet)', 'Email devis', 'Téléphone devis', 
  'Statut', 'Total (€)', 'Articles (JSON)', 'Dépôt (€)'
];

export const FIXWAY_SAV_HEADERS = [
  'Dossier', 'Client', 'Type', 'Statut', 'Marque', 'Modèle', 
  'IMEI', 'Problème', 'Coût (€)', 'Temps (min)'
];

/**
 * Détecte si un fichier correspond au format d'export Fixway
 * @param headers - En-têtes du fichier à analyser
 * @param expectedHeaders - En-têtes Fixway attendus
 * @param threshold - Seuil de correspondance (0-1)
 * @returns true si le format Fixway est détecté
 */
export const detectFixwayFormat = (
  headers: string[],
  expectedHeaders: string[],
  threshold: number = 0.7
): boolean => {
  if (!headers || headers.length === 0) return false;
  
  // Normaliser les en-têtes pour la comparaison
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  const normalizedExpected = expectedHeaders.map(h => h.trim().toLowerCase());
  
  // Compter les correspondances
  const matchCount = normalizedExpected.filter(expected =>
    normalizedHeaders.some(header => header === expected)
  ).length;
  
  // Calculer le ratio de correspondance
  const matchRatio = matchCount / normalizedExpected.length;
  
  return matchRatio >= threshold;
};

/**
 * Récupère une valeur de manière flexible en testant plusieurs noms de colonnes possibles
 * Utile pour accepter différentes variantes de noms (français/anglais/variations)
 * @param row - Ligne de données
 * @param possibleNames - Liste des noms de colonnes possibles
 * @returns La valeur trouvée ou une chaîne vide
 */
export const getFlexibleValue = (row: any, possibleNames: string[]): any => {
  for (const name of possibleNames) {
    // Tester le nom exact
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
    
    // Tester le nom en minuscules
    const lowerName = name.toLowerCase();
    const matchingKey = Object.keys(row).find(key => key.toLowerCase() === lowerName);
    if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null && row[matchingKey] !== '') {
      return row[matchingKey];
    }
  }
  return '';
};

/**
 * Statistiques de mapping pour affichage à l'utilisateur
 */
export interface MappingStats {
  totalColumns: number;
  recognizedColumns: number;
  requiredColumnsPresent: boolean;
  missingRequiredColumns: string[];
  validRows: number;
  warningRows: number;
  invalidRows: number;
}

/**
 * Analyse un fichier importé et génère des statistiques de mapping
 * @param headers - En-têtes du fichier
 * @param expectedHeaders - En-têtes attendus
 * @param data - Données du fichier
 * @param requiredFields - Champs obligatoires
 * @returns Statistiques de mapping
 */
export const analyzeMappingStats = (
  headers: string[],
  expectedHeaders: string[],
  data: any[],
  requiredFields: string[] = []
): MappingStats => {
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  const normalizedExpected = expectedHeaders.map(h => h.trim().toLowerCase());
  
  // Colonnes reconnues
  const recognizedCount = normalizedExpected.filter(expected =>
    normalizedHeaders.some(header => header === expected)
  ).length;
  
  // Colonnes obligatoires manquantes
  const missingRequired = requiredFields.filter(field =>
    !normalizedHeaders.some(header => header === field.toLowerCase())
  );
  
  // Analyser les lignes
  let validRows = 0;
  let warningRows = 0;
  let invalidRows = 0;
  
  data.forEach(row => {
    const hasRequiredFields = requiredFields.every(field =>
      getFlexibleValue(row, [field]) !== ''
    );
    
    if (hasRequiredFields) {
      validRows++;
    } else if (Object.keys(row).some(key => row[key] !== '')) {
      warningRows++;
    } else {
      invalidRows++;
    }
  });
  
  return {
    totalColumns: headers.length,
    recognizedColumns: recognizedCount,
    requiredColumnsPresent: missingRequired.length === 0,
    missingRequiredColumns: missingRequired,
    validRows,
    warningRows,
    invalidRows
  };
};

/**
 * Normalise un nom de colonne pour la comparaison
 * Supprime les accents, espaces, caractères spéciaux
 */
export const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Trouve la colonne correspondante dans les données
 * Utilise plusieurs stratégies de matching
 */
export const findMatchingColumn = (
  columnName: string,
  availableColumns: string[]
): string | null => {
  const normalized = normalizeColumnName(columnName);
  
  // Recherche exacte (insensible à la casse)
  const exactMatch = availableColumns.find(col => 
    col.toLowerCase() === columnName.toLowerCase()
  );
  if (exactMatch) return exactMatch;
  
  // Recherche normalisée
  const normalizedMatch = availableColumns.find(col =>
    normalizeColumnName(col) === normalized
  );
  if (normalizedMatch) return normalizedMatch;
  
  // Recherche partielle
  const partialMatch = availableColumns.find(col =>
    normalizeColumnName(col).includes(normalized) ||
    normalized.includes(normalizeColumnName(col))
  );
  if (partialMatch) return partialMatch;
  
  return null;
};

/**
 * Détecte si un fichier correspond à un export système (format maison)
 * Retourne le type de données détecté ou null
 */
export function detectOwnExportFormat(headers: string[]): 'parts' | 'customers' | 'quotes' | 'savs' | null {
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));
  
  // Headers spécifiques pour chaque type (colonnes clés qui doivent être présentes)
  const keyHeadersByType = {
    parts: ['nom', 'reference', 'quantite', 'prixachat', 'prixvente'],
    customers: ['prenom', 'nom', 'telephone', 'email'],
    quotes: ['numero', 'client', 'montanttotal', 'statut'],
    savs: ['dossier', 'typesav', 'statut', 'client', 'marque']
  };
  
  // Calculer le score de match pour chaque type
  for (const [type, keyHeaders] of Object.entries(keyHeadersByType)) {
    const matchCount = keyHeaders.filter(key => 
      normalizedHeaders.some(h => h.includes(key) || key.includes(h))
    ).length;
    
    // Si au moins 60% des colonnes clés sont présentes
    if (matchCount / keyHeaders.length >= 0.6) {
      return type as 'parts' | 'customers' | 'quotes' | 'savs';
    }
  }
  
  return null;
}

/**
 * Crée automatiquement un mapping basé sur les headers détectés
 */
export function createAutoMapping(headers: string[], type: 'parts' | 'customers' | 'quotes' | 'savs'): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  // Mappings de colonnes par type
  const fieldMappings: Record<string, Record<string, string[]>> = {
    parts: {
      'name': ['nom', 'designation', 'libelle'],
      'reference': ['reference', 'ref', 'code'],
      'quantity': ['quantite', 'stock', 'qte'],
      'purchase_price': ['prixachat', 'pa', 'coutachat'],
      'selling_price': ['prixvente', 'pv', 'prix'],
      'min_stock': ['stockmin', 'stockminimum', 'minimum'],
      'supplier': ['fournisseur', 'supplier'],
      'sku': ['sku', 'codearticle'],
      'time_minutes': ['tempsmn', 'temps', 'duree'],
      'notes': ['notes', 'remarques', 'commentaires']
    },
    customers: {
      'first_name': ['prenom', 'firstname'],
      'last_name': ['nom', 'lastname', 'nomdefamille'],
      'email': ['email', 'mail', 'courriel'],
      'phone': ['telephone', 'tel', 'mobile', 'phone'],
      'address': ['adresse', 'address', 'rue']
    },
    quotes: {
      'quote_number': ['numero', 'numdevis', 'reference'],
      'customer_name': ['client', 'nomclient', 'clientnomcomplet'],
      'customer_email': ['emaildevis', 'email'],
      'customer_phone': ['telephonedevis', 'telephone', 'tel'],
      'total_amount': ['total', 'montanttotal', 'montant'],
      'status': ['statut', 'etat', 'status'],
      'deposit_amount': ['depot', 'acompte'],
      'device_brand': ['marque', 'brand', 'marqueappareil'],
      'device_model': ['modele', 'model', 'modeleappareil'],
      'problem_description': ['description', 'probleme', 'descriptionprobleme'],
      'notes': ['notes', 'remarques', 'commentaires']
    },
    savs: {
      'case_number': ['dossier', 'numero', 'numfiche', 'numerodossier'],
      'customer_id': ['clientid', 'idclient'],
      'sav_type': ['type', 'typesav', 'categorie'],
      'status': ['statut', 'etat', 'status'],
      'device_brand': ['marque', 'brand', 'marqueappareil'],
      'device_model': ['modele', 'model', 'modeleappareil'],
      'imei': ['imei', 'sn', 'numerodeserie', 'serial'],
      'pattern_lock': ['code', 'pattern', 'patternlock', 'verrouillage'],
      'issue_description': ['probleme', 'descriptionprobleme', 'panne', 'symptomes'],
      'diagnostic': ['diagnostic', 'diagnostique', 'analyse'],
      'total_cost': ['cout', 'couttotal', 'total', 'montant'],
      'total_time_minutes': ['tempsmn', 'temps', 'duree', 'minutes'],
      'notes': ['notes', 'remarques', 'commentaires', 'observations']
    }
  };
  
  const typeMapping = fieldMappings[type];
  if (!typeMapping) return mapping;
  
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));
  
  // Pour chaque champ système, trouver la colonne correspondante
  for (const [systemField, possibleNames] of Object.entries(typeMapping)) {
    for (const possibleName of possibleNames) {
      const normalizedPossible = normalizeColumnName(possibleName);
      const matchIndex = normalizedHeaders.findIndex(h => 
        h === normalizedPossible || h.includes(normalizedPossible) || normalizedPossible.includes(h)
      );
      
      if (matchIndex !== -1) {
        mapping[systemField] = headers[matchIndex];
        break;
      }
    }
  }
  
  return mapping;
}
