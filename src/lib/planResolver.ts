/**
 * Plan identification rule:
 * Always identify a subscription plan by its stable `id` or `tier_key`.
 * The `name` is an editable display label managed by the super admin
 * and MUST NEVER be used as a matching key. Renaming a plan must not
 * break any business logic.
 */

export interface PlanLike {
  id: string;
  tier_key?: string | null;
  name: string;
  [key: string]: any;
}

export interface ShopLike {
  subscription_plan_id?: string | null;
  subscription_tier?: string | null;
  [key: string]: any;
}

/**
 * Resolve the plan associated with a shop.
 * Priority: subscription_plan_id > tier_key match > free fallback.
 */
export function resolvePlan<T extends PlanLike>(
  shop: ShopLike | null | undefined,
  plans: T[] | null | undefined
): T | undefined {
  if (!shop || !plans?.length) return undefined;

  if (shop.subscription_plan_id) {
    const byId = plans.find(p => p.id === shop.subscription_plan_id);
    if (byId) return byId;
  }

  const tier = (shop.subscription_tier || 'free').toLowerCase();
  const byTier = plans.find(p => (p.tier_key || '').toLowerCase() === tier);
  if (byTier) return byTier;

  // Last-resort fallback: free plan
  return plans.find(p => (p.tier_key || '').toLowerCase() === 'free');
}

export function getPlanByTierKey<T extends PlanLike>(
  plans: T[] | null | undefined,
  tierKey: string | null | undefined
): T | undefined {
  if (!plans?.length || !tierKey) return undefined;
  const k = tierKey.toLowerCase();
  return plans.find(p => (p.tier_key || '').toLowerCase() === k);
}
