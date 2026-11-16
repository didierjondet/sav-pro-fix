import { describe, it, expect } from 'vitest';
import { buildFunnel, FunnelShop } from './activationFunnel';
const base: FunnelShop = { shop_id: 'a', shop_name: 'A', created_at: '2026-11-01', owner_email: null, customers: 0, savs: 0, quotes: 0, sms: 0, last_sign_in_at: null, returned_d1: false, returned_d7: false, subscribed: false, tier: null };
describe('buildFunnel', () => {
  it('counts each step', () => {
    const f = buildFunnel([base, { ...base, customers: 2, savs: 6, subscribed: true }, { ...base, savs: 1 }]);
    const n = Object.fromEntries(f.map((s) => [s.key, s.n]));
    expect(n).toMatchObject({ signup: 3, customer: 1, sav: 2, active: 1, subscribed: 1 });
  });
});
