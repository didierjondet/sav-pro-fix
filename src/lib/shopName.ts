import { supabase } from '@/integrations/supabase/client';

export const PLACEHOLDER_SHOP_NAME = 'mon magasin';
export const DUPLICATE_SHOP_NAME_MESSAGE =
  'Ce nom est déjà utilisé par un autre magasin. Ajoutez par exemple votre ville.';

/** Same rule as SQL shop_name_key: lowercase, no accents, collapsed spaces. */
export function shopNameKey(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isPlaceholderShopName(name: string): boolean {
  return shopNameKey(name) === PLACEHOLDER_SHOP_NAME;
}

export function isDuplicateShopNameError(err: any): boolean {
  return err?.code === '23505' && String(err?.message || '').includes('shops_unique_normalized_name');
}

export async function isShopNameAvailable(name: string, excludeShopId?: string | null): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('is_shop_name_available', {
    _name: name,
    _exclude_shop_id: excludeShopId ?? null,
  });
  if (error) return true; // server unique index remains the final guard
  return data !== false;
}
