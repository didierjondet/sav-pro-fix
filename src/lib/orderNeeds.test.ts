import { describe, expect, test } from 'bun:test';
import { computeUncoveredSavNeeds } from './orderNeeds';

const mk = (sav: string, date: string, stock: number, is_final = false) => ({
  part_id: 'p1', sav_case_id: sav, quantity: 1, physical_stock: stock, case_created_at: date, is_final,
});

describe('computeUncoveredSavNeeds', () => {
  test('stock 1 pour 3 SAV ouverts => 2 SAV à commander (les plus récents)', () => {
    const r = computeUncoveredSavNeeds([mk('c', '2026-10-30', 1), mk('a', '2026-08-21', 1), mk('b', '2026-10-10', 1)]);
    expect(r.map(x => x.item.sav_case_id)).toEqual(['b', 'c']);
  });
  test('stock 0 => tous les SAV à commander', () => {
    expect(computeUncoveredSavNeeds([mk('a', '1', 0), mk('b', '2', 0)]).length).toBe(2);
  });
  test('SAV au statut final ignoré', () => {
    expect(computeUncoveredSavNeeds([mk('a', '1', 0, true)]).length).toBe(0);
  });
});
