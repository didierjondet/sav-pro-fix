/**
 * Fonctions utilitaires centralisées pour le formatage des nombres dans les widgets statistiques
 * Toutes les valeurs sont arrondies à l'entier pour une meilleure lisibilité
 */

/**
 * Formate un montant en euros avec séparateur de milliers
 * @param value - Montant à formater
 * @returns Montant formaté en euros (ex: "2 345 €")
 */
export const formatIntegerCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(Math.round(value || 0));
};

/**
 * Formate un montant en euros de façon compacte (k, M)
 * @param value - Montant à formater
 * @returns Montant compact (ex: "2k€", "2M€")
 */
export const formatCompactCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(Math.round(value || 0));
};

/**
 * Formate un pourcentage en nombre entier
 * @param value - Valeur du pourcentage
 * @param includeSign - Inclure le signe + pour les valeurs positives
 * @returns Pourcentage formaté (ex: "45%", "+23%")
 */
export const formatIntegerPercent = (value: number, includeSign: boolean = false): string => {
  const rounded = Math.round(value);
  const sign = includeSign && rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
};

/**
 * Formate un nombre entier avec séparateur de milliers
 * @param value - Nombre à formater
 * @returns Nombre formaté (ex: "2 345")
 */
export const formatInteger = (value: number): string => {
  return Math.round(value || 0).toLocaleString('fr-FR');
};

/**
 * Formatter pour les axes Y des graphiques (montants en milliers)
 * @param value - Valeur de l'axe
 * @returns Valeur formatée pour l'axe (ex: "2k€")
 */
export const integerCurrencyTickFormatter = (value: number): string => {
  const thousands = Math.round(value / 1000);
  return `${thousands}k€`;
};

/**
 * Formatter pour les axes Y des graphiques (pourcentages)
 * @param value - Valeur de l'axe
 * @returns Valeur formatée pour l'axe (ex: "45%")
 */
export const percentTickFormatter = (value: number): string => {
  return `${Math.round(value)}%`;
};

/**
 * Formatter générique pour les axes Y des graphiques (nombres)
 * @param value - Valeur de l'axe
 * @returns Valeur arrondie
 */
export const integerTickFormatter = (value: number): string => {
  return Math.round(value).toString();
};
