/**
 * Utility functions for price management
 */

/**
 * Check if a price is outdated based on last update timestamp
 * @param priceLastUpdated - The last update timestamp
 * @param monthsThreshold - Number of months to consider outdated (default: 6)
 * @returns true if price is outdated or never updated
 */
export const isPriceOutdated = (
  priceLastUpdated: string | null | undefined,
  monthsThreshold: number = 6
): boolean => {
  if (!priceLastUpdated) return true; // Never updated = outdated
  
  const lastUpdate = new Date(priceLastUpdated);
  const now = new Date();
  const monthsDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  return monthsDiff > monthsThreshold;
};

/**
 * Calculate the number of months since last price update
 * @param priceLastUpdated - The last update timestamp
 * @returns Number of months since last update (Infinity if never updated)
 */
export const getMonthsSinceUpdate = (priceLastUpdated: string | null | undefined): number => {
  if (!priceLastUpdated) return Infinity;
  
  const lastUpdate = new Date(priceLastUpdated);
  const now = new Date();
  return Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30));
};
