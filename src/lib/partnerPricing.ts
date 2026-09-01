export interface PartnerVatSettings {
  prices_include_vat?: boolean | null;
  vat_rate?: number | null;
  vat_exempt?: boolean | null;
}

export const VAT_EXEMPT_MENTION = 'TVA non applicable, art. 293 B du CGI';

export function formatEuro(value?: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value));
}

/**
 * Dérive HT / TTC à partir d'un prix saisi et des réglages TVA du partenaire.
 * - Magasin non assujetti : un seul montant, sans TVA.
 * - Magasin assujetti : les deux montants sont calculés.
 */
export function derivePartnerPrice(price: number | null | undefined, settings: PartnerVatSettings) {
  if (price == null) return { ht: null as number | null, ttc: null as number | null, exempt: !!settings.vat_exempt };
  const rate = (Number(settings.vat_rate) || 0) / 100;
  if (settings.vat_exempt || rate <= 0) {
    return { ht: Number(price), ttc: Number(price), exempt: true };
  }
  if (settings.prices_include_vat) {
    return { ht: Number(price) / (1 + rate), ttc: Number(price), exempt: false };
  }
  return { ht: Number(price), ttc: Number(price) * (1 + rate), exempt: false };
}

/** Libellé court d'un prix, avec la mention HT/TTC adaptée. */
export function formatPartnerPrice(
  price: number | null | undefined,
  settings: PartnerVatSettings,
  prefer: 'ht' | 'ttc'
): string {
  const { ht, ttc, exempt } = derivePartnerPrice(price, settings);
  if (ht == null) return '—';
  if (exempt) return `${formatEuro(ht)} (${VAT_EXEMPT_MENTION})`;
  return prefer === 'ht'
    ? `${formatEuro(ht)} HT · ${formatEuro(ttc)} TTC`
    : `${formatEuro(ttc)} TTC · ${formatEuro(ht)} HT`;
}
