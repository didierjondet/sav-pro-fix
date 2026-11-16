// @ts-ignore
import { describe, expect, test } from 'bun:test';
import { shopNameKey, isPlaceholderShopName } from './shopName';

describe('shop name uniqueness key', () => {
  test('ignores case, accents and extra spaces', () => {
    expect(shopNameKey('  Easycash   Agdé ')).toBe(shopNameKey('easycash agde'));
  });
  test('different names stay different', () => {
    expect(shopNameKey('Easycash Agde')).not.toBe(shopNameKey('Easycash Béziers'));
  });
  test('placeholder "Mon Magasin" is exempt', () => {
    expect(isPlaceholderShopName('Mon  Magasin')).toBe(true);
    expect(isPlaceholderShopName('Mon atelier')).toBe(false);
  });
});
