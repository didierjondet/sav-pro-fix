import { describe, expect, test } from 'bun:test';
import { computeQuoteRevenue, isQuoteCounted } from '../src/lib/savFinance';

const billing = {
  vat_regime: 'standard',
  prices_include_vat: true,
  vat_rate_parts: 20,
  vat_rate_labor: 20,
  labor_billing_enabled: false,
  labor_mode: 'flat',
  labor_hourly_rate: 60,
  labor_label: "Main d'œuvre",
};

describe('devis inclus dans les calculs financiers', () => {
  test('compte un devis accepté sans SAV', () => {
    const quote = { status: 'accepted', sav_case_id: null, total_amount: 149.99 };

    expect(isQuoteCounted(quote)).toBe(true);
    expect(computeQuoteRevenue(quote, billing as any)).toEqual({
      revenueHT: 124.99,
      revenueTTC: 149.99,
    });
  });

  test('exclut un devis transformé en SAV', () => {
    const quote = { status: 'accepted', sav_case_id: 'sav-1', total_amount: 149.99 };

    expect(isQuoteCounted(quote)).toBe(false);
    expect(computeQuoteRevenue(quote, billing as any)).toEqual({
      revenueHT: 0,
      revenueTTC: 0,
    });
  });

  test('exclut un devis qui n’est pas accepté', () => {
    expect(isQuoteCounted({ status: 'sent', sav_case_id: null, total_amount: 149.99 })).toBe(false);
  });

  test('reproduit les totaux vérifiés pour Agde', () => {
    const quoteHT = [149.99, 169.99, 40].reduce(
      (sum, total_amount) => sum + computeQuoteRevenue(
        { status: 'accepted', sav_case_id: null, total_amount },
        billing as any,
      ).revenueHT,
      0,
    );

    expect(quoteHT).toBeCloseTo(299.98, 2);
    expect(258.32 + quoteHT).toBeCloseTo(558.30, 2);
    expect(-578.51 + quoteHT).toBeCloseTo(-278.53, 2);
  });
});