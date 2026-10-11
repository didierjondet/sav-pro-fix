import { supabase } from '@/integrations/supabase/client';

/**
 * Réplication Super Admin -> Stripe.
 * La base reste la référence : en cas d'échec Stripe, on signale l'erreur
 * mais l'enregistrement en base n'est pas remis en cause.
 */
export async function syncStripeProduct(kind: 'plan' | 'sms_package', id: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-stripe-product', {
      body: { kind, id },
    });
    if (error) return { ok: false, message: error.message };
    if (data?.error) return { ok: false, message: data.error };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e) };
  }
}
