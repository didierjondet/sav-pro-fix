export interface BuybackCategory {
  id: string;
  label: string;
  emoji: string;
}

export const BUYBACK_CATEGORIES: BuybackCategory[] = [
  { id: 'smartphone', label: 'Smartphone', emoji: '📱' },
  { id: 'tablette', label: 'Tablette', emoji: '📲' },
  { id: 'ordinateur', label: 'Ordinateur / portable', emoji: '💻' },
  { id: 'tv', label: 'TV / vidéoprojecteur', emoji: '📺' },
  { id: 'electromenager', label: 'Électroménager', emoji: '🧺' },
  { id: 'trottinette', label: 'Trottinette / vélo électrique', emoji: '🛴' },
  { id: 'console', label: 'Console de jeu', emoji: '🎮' },
  { id: 'autre', label: 'Autre matériel', emoji: '📦' },
];

export function getCategoryLabel(id: string) {
  return BUYBACK_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function getCategoryEmoji(id: string) {
  return BUYBACK_CATEGORIES.find((c) => c.id === id)?.emoji ?? '📦';
}

export type BuybackQuestionType = 'text' | 'select' | 'textarea';

export interface BuybackQuestion {
  id: string;
  label: string;
  type: BuybackQuestionType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

const COMMON_END: BuybackQuestion[] = [
  { id: 'panne', label: 'Décrivez la panne ou les dégâts', type: 'textarea', required: true, placeholder: 'Ex : écran fissuré en bas à droite, tactile fonctionnel' },
  { id: 'accessoires', label: 'Accessoires fournis', type: 'text', placeholder: 'Chargeur, boîte, câble…' },
  { id: 'facture', label: 'Avez-vous la facture d\'achat ?', type: 'select', options: ['Oui', 'Non'] },
  { id: 'anciennete', label: 'Âge approximatif de l\'appareil', type: 'select', options: ['Moins d\'un an', '1 à 2 ans', '2 à 4 ans', 'Plus de 4 ans', 'Je ne sais pas'] },
];

const ETAT_GENERAL: BuybackQuestion = {
  id: 'etat_general',
  label: 'État général',
  type: 'select',
  required: true,
  options: ['Comme neuf', 'Bon état', 'Traces d\'usage', 'Très abîmé'],
};

const ALLUMAGE: BuybackQuestion = {
  id: 'allumage',
  label: 'L\'appareil s\'allume-t-il ?',
  type: 'select',
  required: true,
  options: ['Oui, normalement', 'Oui, mais avec des défauts', 'Non'],
};

export const BUYBACK_QUESTIONS: Record<string, BuybackQuestion[]> = {
  smartphone: [
    { id: 'capacite', label: 'Capacité de stockage', type: 'select', options: ['32 Go', '64 Go', '128 Go', '256 Go', '512 Go et +', 'Je ne sais pas'] },
    { id: 'ecran', label: 'État de l\'écran', type: 'select', required: true, options: ['Intact', 'Rayé', 'Fissuré', 'Cassé / tactile HS', 'Affichage HS'] },
    ALLUMAGE,
    { id: 'batterie', label: 'Tenue de la batterie', type: 'select', options: ['Bonne', 'Moyenne', 'Faible', 'Ne charge plus', 'Je ne sais pas'] },
    { id: 'verrouillage', label: 'Compte iCloud / Google désactivé ?', type: 'select', required: true, options: ['Oui', 'Non', 'Je ne sais pas'] },
    ETAT_GENERAL,
    ...COMMON_END,
  ],
  tablette: [
    { id: 'capacite', label: 'Capacité de stockage', type: 'select', options: ['32 Go', '64 Go', '128 Go', '256 Go', '512 Go et +', 'Je ne sais pas'] },
    { id: 'ecran', label: 'État de l\'écran', type: 'select', required: true, options: ['Intact', 'Rayé', 'Fissuré', 'Cassé / tactile HS', 'Affichage HS'] },
    ALLUMAGE,
    { id: 'verrouillage', label: 'Compte iCloud / Google désactivé ?', type: 'select', options: ['Oui', 'Non', 'Je ne sais pas'] },
    ETAT_GENERAL,
    ...COMMON_END,
  ],
  ordinateur: [
    { id: 'processeur', label: 'Processeur / génération', type: 'text', placeholder: 'Ex : Intel i5 10e gen, Apple M1' },
    { id: 'ram', label: 'Mémoire vive', type: 'select', options: ['4 Go', '8 Go', '16 Go', '32 Go et +', 'Je ne sais pas'] },
    { id: 'stockage', label: 'Disque', type: 'text', placeholder: 'Ex : SSD 512 Go' },
    ALLUMAGE,
    { id: 'ecran', label: 'État de l\'écran', type: 'select', options: ['Intact', 'Rayé', 'Fissuré', 'Affichage HS', 'Sans écran'] },
    ETAT_GENERAL,
    ...COMMON_END,
  ],
  tv: [
    { id: 'taille', label: 'Taille de la dalle', type: 'select', required: true, options: ['Moins de 32"', '32" à 43"', '43" à 55"', '55" à 65"', 'Plus de 65"'] },
    { id: 'dalle', label: 'État de la dalle', type: 'select', required: true, options: ['Intacte', 'Rayée', 'Fissurée', 'Cassée'] },
    ALLUMAGE,
    { id: 'son', label: 'Le son fonctionne-t-il ?', type: 'select', options: ['Oui', 'Non', 'Je ne sais pas'] },
    ...COMMON_END,
  ],
  electromenager: [
    { id: 'type_appareil', label: 'Type d\'appareil', type: 'text', required: true, placeholder: 'Lave-linge, four, aspirateur…' },
    ALLUMAGE,
    { id: 'symptome', label: 'Symptôme principal', type: 'text', placeholder: 'Ex : ne vidange plus, code erreur E4' },
    ETAT_GENERAL,
    ...COMMON_END,
  ],
  trottinette: [
    { id: 'autonomie', label: 'Autonomie constatée', type: 'select', options: ['Normale', 'Réduite', 'Ne tient plus la charge', 'Je ne sais pas'] },
    ALLUMAGE,
    { id: 'roulement', label: 'Roues / pneus', type: 'select', options: ['Bon état', 'Usés', 'Crevés / HS'] },
    { id: 'freinage', label: 'Freinage', type: 'select', options: ['Fonctionnel', 'À régler', 'HS'] },
    ETAT_GENERAL,
    ...COMMON_END,
  ],
  console: [
    { id: 'modele_console', label: 'Modèle exact', type: 'text', placeholder: 'Ex : PS5 Slim, Switch OLED' },
    ALLUMAGE,
    { id: 'lecteur', label: 'Lecteur de disque / cartouche', type: 'select', options: ['Fonctionnel', 'Défectueux', 'Sans lecteur'] },
    { id: 'manettes', label: 'Nombre de manettes fournies', type: 'select', options: ['0', '1', '2', '3 et +'] },
    ETAT_GENERAL,
    ...COMMON_END,
  ],
  autre: [
    { id: 'type_appareil', label: 'Type d\'appareil', type: 'text', required: true },
    ALLUMAGE,
    ETAT_GENERAL,
    ...COMMON_END,
  ],
};

export function getQuestions(category: string): BuybackQuestion[] {
  return BUYBACK_QUESTIONS[category] ?? BUYBACK_QUESTIONS.autre;
}

export const BUYBACK_STATUS_LABELS: Record<string, string> = {
  pending: 'Nouvelle demande',
  offered: 'Offre envoyée',
  accepted: 'Offre acceptée',
  refused: 'Refusée',
  network: 'Ouverte au réseau',
  network_closed: 'Offres réseau transmises',
  expired: 'Expirée',
};

export const SELECTION_RULES = [
  { id: 'weighted_random', label: 'Tirage pondéré par le montant', description: 'Plus l\'offre est élevée, plus la chance d\'être tirée est grande (plafonnée).' },
  { id: 'random_top', label: 'Tirage au sort parmi les meilleures offres', description: 'Tirage aléatoire parmi les offres du haut du panier (top 30 %).' },
  { id: 'best_amounts', label: 'Les 3 meilleurs montants', description: 'Pas de hasard sur la sélection, uniquement sur l\'ordre d\'affichage.' },
];
