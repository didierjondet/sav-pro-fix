// @ts-ignore
import { describe, expect, test } from 'bun:test';
import { SHOP_ACTIVITIES, isDemoPhone } from './activityTemplates';

describe('activity templates', () => {
  test('offers the 5 trades requested', () => {
    expect(SHOP_ACTIVITIES.map(a => a.key)).toEqual(['phone', 'computer', 'appliance', 'console', 'audio']);
  });
  test('sample customer phones are recognised, real ones are not', () => {
    expect(isDemoPhone('0600000001')).toBe(true);
    expect(isDemoPhone('+33600000006')).toBe(true);
    expect(isDemoPhone('0612345678')).toBe(false);
  });
});
