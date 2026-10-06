// Source unique des informations légales de l'éditeur de Fixway.
export const LEGAL = {
  brand: 'Fixway',
  company: 'SAS HAPICS',
  legalForm: 'Société par actions simplifiée',
  capital: '10 000 €',
  address: '34 rue du Docteur Abel, 26000 Valence, France',
  siren: '803 138 577',
  rcs: 'RCS Romans 803 138 577',
  vat: 'FR54803138577',
  ape: '58.29A (Édition de logiciels système et de réseau)',
  director: 'Christophe Jondet',
  email: 'fixwaypro@gmail.com',
  site: 'https://fixway.fr',
  updatedAt: '6 octobre 2026',
} as const;

export const LEGAL_LINKS = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/cgu', label: "Conditions d'utilisation" },
  { to: '/cgv', label: 'Conditions de vente' },
  { to: '/confidentialite', label: 'Confidentialité' },
  { to: '/cookies', label: 'Cookies' },
] as const;
