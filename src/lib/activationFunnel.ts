export interface FunnelShop {
  shop_id: string; shop_name: string; created_at: string; owner_email: string | null;
  customers: number; savs: number; quotes: number; sms: number;
  last_sign_in_at: string | null; returned_d1: boolean; returned_d7: boolean; subscribed: boolean; tier: string | null;
}

export function buildFunnel(shops: FunnelShop[]) {
  const c = (f: (s: FunnelShop) => boolean) => shops.filter(f).length;
  return [
    { key: 'signup', label: 'Inscrits', n: shops.length },
    { key: 'customer', label: '1er client créé', n: c((s) => s.customers > 0) },
    { key: 'sav', label: '1er SAV créé', n: c((s) => s.savs > 0) },
    { key: 'returned_d1', label: 'Revenu après J+1', n: c((s) => s.returned_d1) },
    { key: 'active', label: '5 SAV ou plus', n: c((s) => s.savs >= 5) },
    { key: 'returned_d7', label: 'Revenu après J+7', n: c((s) => s.returned_d7) },
    { key: 'subscribed', label: 'Abonné payant', n: c((s) => s.subscribed) },
  ];
}
