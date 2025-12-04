-- Add two separate columns for granular financial exclusion control
ALTER TABLE shop_sav_types 
ADD COLUMN IF NOT EXISTS exclude_purchase_costs BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS exclude_sales_revenue BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing data from exclude_from_stats to both new columns
UPDATE shop_sav_types 
SET exclude_purchase_costs = exclude_from_stats,
    exclude_sales_revenue = exclude_from_stats
WHERE exclude_from_stats = true;

-- Add comments for documentation
COMMENT ON COLUMN shop_sav_types.exclude_purchase_costs IS 'Exclure les coûts d''achat des statistiques financières';
COMMENT ON COLUMN shop_sav_types.exclude_sales_revenue IS 'Exclure les revenus de vente des statistiques financières';

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_shop_sav_types_exclude_purchase_costs ON shop_sav_types(exclude_purchase_costs) WHERE exclude_purchase_costs = true;
CREATE INDEX IF NOT EXISTS idx_shop_sav_types_exclude_sales_revenue ON shop_sav_types(exclude_sales_revenue) WHERE exclude_sales_revenue = true;