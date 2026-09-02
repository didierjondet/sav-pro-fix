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
  refused_by_shop: 'Refusée par le magasin',
  network: 'Ouverte au réseau',
  network_closed: 'Offres réseau transmises',
  expired: 'Expirée',
};

export const SELECTION_RULES = [
  { id: 'weighted_random', label: 'Tirage pondéré par le montant', description: 'Plus l\'offre est élevée, plus la chance d\'être tirée est grande (plafonnée).' },
  { id: 'random_top', label: 'Tirage au sort parmi les meilleures offres', description: 'Tirage aléatoire parmi les offres du haut du panier (top 30 %).' },
  { id: 'best_amounts', label: 'Les 3 meilleurs montants', description: 'Pas de hasard sur la sélection, uniquement sur l\'ordre d\'affichage.' },
];

/* ---------------------------------------------------------------
   Guidage photos, accessoires et points en panne (par catégorie)
   --------------------------------------------------------------- */

export interface PhotoGuide {
  id: string;
  label: string;
  hint: string;
  required?: boolean;
}

const PHOTO_COMMON: PhotoGuide[] = [
  { id: 'ensemble', label: 'Vue d\'ensemble', hint: 'Appareil entier, posé à plat, bien éclairé, sans reflet.', required: true },
  { id: 'defaut', label: 'Gros plan du défaut', hint: 'Cadrez la zone abîmée à 20 cm environ.', required: true },
];

export const BUYBACK_PHOTO_GUIDES: Record<string, PhotoGuide[]> = {
  smartphone: [
    { id: 'face_allume', label: 'Écran allumé, de face', hint: 'Appareil déverrouillé si possible, à 90° au-dessus de l\'écran.', required: true },
    { id: 'dos', label: 'Dos de l\'appareil', hint: 'Montrez le dos entier et les objectifs photo.', required: true },
    { id: 'tranches', label: 'Tranches / contours', hint: 'Une photo en biais pour voir les chocs sur le châssis.' },
    { id: 'reglages', label: 'Écran des réglages', hint: 'Capture ou photo de la page « À propos » (modèle, capacité, état batterie).' },
    ...PHOTO_COMMON.slice(1),
  ],
  tablette: [
    { id: 'face_allume', label: 'Écran allumé, de face', hint: 'À 90° au-dessus de la dalle.', required: true },
    { id: 'dos', label: 'Dos de la tablette', hint: 'Dos entier, référence visible si possible.', required: true },
    ...PHOTO_COMMON.slice(1),
  ],
  ordinateur: [
    { id: 'ouvert', label: 'Ordinateur ouvert et allumé', hint: 'Vue de face, écran affichant le bureau.', required: true },
    { id: 'clavier', label: 'Clavier et repose-poignets', hint: 'Vue du dessus pour montrer l\'usure.' },
    { id: 'dessous', label: 'Étiquette du dessous', hint: 'Référence / numéro de série lisibles.', required: true },
    ...PHOTO_COMMON.slice(1),
  ],
  tv: [
    { id: 'dalle_allumee', label: 'Dalle allumée', hint: 'Photo de face, dans une pièce sombre, écran affichant une image claire.', required: true },
    { id: 'dalle_eteinte', label: 'Dalle éteinte', hint: 'Permet de voir les fissures et les rayures.', required: true },
    { id: 'etiquette', label: 'Étiquette arrière', hint: 'Modèle exact et numéro de série.', required: true },
    ...PHOTO_COMMON.slice(1),
  ],
  electromenager: [
    { id: 'face', label: 'Appareil de face', hint: 'Appareil entier, porte fermée.', required: true },
    { id: 'plaque', label: 'Plaque signalétique', hint: 'Souvent sur le côté, à l\'arrière ou dans l\'ouverture.', required: true },
    ...PHOTO_COMMON.slice(1),
  ],
  trottinette: [
    { id: 'profil', label: 'Vue de profil dépliée', hint: 'Trottinette / vélo entier de côté.', required: true },
    { id: 'roues', label: 'Roues et pneus', hint: 'Gros plan sur l\'usure et l\'état des pneus.' },
    { id: 'ecran_batterie', label: 'Écran / niveau de batterie', hint: 'Appareil allumé, affichage lisible.' },
    ...PHOTO_COMMON.slice(1),
  ],
  console: [
    { id: 'face', label: 'Console de face', hint: 'Console entière, allumée si possible.', required: true },
    { id: 'connectique', label: 'Connectique arrière', hint: 'Ports HDMI / alimentation.' },
    { id: 'accessoires_photo', label: 'Accessoires fournis', hint: 'Manettes, câbles, jeux posés ensemble.' },
    ...PHOTO_COMMON.slice(1),
  ],
  autre: PHOTO_COMMON,
};

export function getPhotoGuides(category: string): PhotoGuide[] {
  return BUYBACK_PHOTO_GUIDES[category] ?? BUYBACK_PHOTO_GUIDES.autre;
}

export const BUYBACK_ACCESSORIES: Record<string, string[]> = {
  smartphone: ['Boîte d\'origine', 'Chargeur', 'Câble', 'Écouteurs', 'Coque', 'Facture'],
  tablette: ['Boîte d\'origine', 'Chargeur', 'Câble', 'Stylet', 'Étui / clavier', 'Facture'],
  ordinateur: ['Chargeur d\'origine', 'Boîte', 'Sacoche', 'Souris', 'Facture'],
  tv: ['Télécommande', 'Pied / support', 'Câble d\'alimentation', 'Boîte', 'Facture'],
  electromenager: ['Notice', 'Accessoires d\'origine', 'Tuyaux / câbles', 'Facture'],
  trottinette: ['Chargeur', 'Clé / antivol', 'Boîte', 'Facture'],
  console: ['Manette(s)', 'Câble HDMI', 'Alimentation', 'Jeux', 'Boîte', 'Facture'],
  autre: ['Chargeur / alimentation', 'Boîte', 'Accessoires', 'Facture'],
};

export function getAccessories(category: string): string[] {
  return BUYBACK_ACCESSORIES[category] ?? BUYBACK_ACCESSORIES.autre;
}

export const BUYBACK_ISSUES: Record<string, string[]> = {
  smartphone: ['Écran cassé', 'Tactile HS', 'Batterie faible', 'Ne charge plus', 'Caméra HS', 'Son / micro HS', 'Boutons HS', 'Vitre arrière cassée', 'Désoxydation / tombé dans l\'eau', 'Ne s\'allume pas'],
  tablette: ['Écran cassé', 'Tactile HS', 'Batterie faible', 'Ne charge plus', 'Wi-Fi HS', 'Son HS', 'Ne s\'allume pas'],
  ordinateur: ['Écran cassé', 'Clavier HS', 'Batterie HS', 'Ne charge plus', 'Surchauffe', 'Disque HS', 'Ne démarre pas', 'Dégât liquide'],
  tv: ['Dalle cassée', 'Lignes / taches à l\'image', 'Pas d\'image', 'Pas de son', 'Ne s\'allume pas', 'Ports HDMI HS', 'Télécommande manquante'],
  electromenager: ['Ne s\'allume pas', 'Fuite d\'eau', 'Ne chauffe pas', 'Bruit anormal', 'Code erreur affiché', 'Programme bloqué'],
  trottinette: ['Batterie faible', 'Ne charge plus', 'Frein HS', 'Roue / pneu HS', 'Guidon abîmé', 'Ne démarre pas'],
  console: ['Ne s\'allume pas', 'Lecteur HS', 'Surchauffe / ventilation bruyante', 'Ports HS', 'Manette défectueuse', 'Pas d\'image'],
  autre: ['Ne s\'allume pas', 'Panne intermittente', 'Dégât physique', 'Dégât liquide', 'Bruit anormal'],
};

export function getIssues(category: string): string[] {
  return BUYBACK_ISSUES[category] ?? BUYBACK_ISSUES.autre;
}
