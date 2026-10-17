import { describe, it, expect } from 'vitest';
import { matchFamilyForDevice } from '../src/lib/productFamilies';

const fams = [
  { id: 'tel', name: 'Téléphones' },
  { id: 'con', name: 'Consoles' },
  { id: 'info', name: 'Informatique' },
  { id: 'tab', name: 'Tablettes' },
  { id: 'aut', name: 'Autres' },
];

describe('matchFamilyForDevice', () => {
  it('APPLE / IPHONE 13 → Téléphones', () => {
    expect(matchFamilyForDevice(fams, 'APPLE', 'IPHONE 13').familyId).toBe('tel');
  });
  it('SONY / PS5 → Consoles', () => {
    expect(matchFamilyForDevice(fams, 'SONY', 'PS5').familyId).toBe('con');
  });
  it('archived family is never proposed', () => {
    expect(matchFamilyForDevice([{ id: 'tel', name: 'Téléphones', is_active: false }], 'APPLE', 'IPHONE 13').familyId).toBeNull();
  });
  it('unknown device leaves choice to AI', () => {
    expect(matchFamilyForDevice(fams, 'BOSCH', 'PERCEUSE').familyId).toBeNull();
  });
});
