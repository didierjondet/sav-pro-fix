import { describe, expect, test } from 'bun:test';
import { isValidImei, isMobileSessionUsable, filterPartsForDevice } from '../src/lib/mobileSav';

describe('mobile SAV', () => {
  test('IMEI valide accepté (Luhn)', () => {
    expect(isValidImei('490154203237518')).toBe(true);
  });
  test('IMEI à mauvaise clé refusé', () => {
    expect(isValidImei('490154203237519')).toBe(false);
  });
  test('IMEI de 14 chiffres refusé', () => {
    expect(isValidImei('49015420323751')).toBe(false);
  });
  test('session expirée refusée', () => {
    const now = new Date('2026-10-14T10:00:00Z');
    expect(isMobileSessionUsable({ status: 'waiting', expires_at: '2026-10-14T09:59:00Z' }, now)).toBe(false);
  });
  test('session déjà soumise refusée (usage unique)', () => {
    const now = new Date('2026-10-14T10:00:00Z');
    expect(isMobileSessionUsable({ status: 'submitted', expires_at: '2026-10-14T10:10:00Z' }, now)).toBe(false);
  });
  test('session en cours acceptée', () => {
    const now = new Date('2026-10-14T10:00:00Z');
    expect(isMobileSessionUsable({ status: 'connected', expires_at: '2026-10-14T10:10:00Z' }, now)).toBe(true);
  });
  test('pièces filtrées sur le modèle', () => {
    const parts = [{ name: 'Ecran iPhone 12' }, { name: 'Batterie iPhone 13' }, { name: 'Ecran Galaxy A12' }];
    expect(filterPartsForDevice(parts, 'APPLE', 'IPHONE 12').map((p) => p.name)).toEqual(['Ecran iPhone 12']);
  });
});
