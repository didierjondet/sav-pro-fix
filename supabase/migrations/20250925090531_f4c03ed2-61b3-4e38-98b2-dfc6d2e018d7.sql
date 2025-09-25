-- Add menu configuration to subscription plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS menu_config JSONB DEFAULT '{
  "dashboard": true,
  "sav": true,
  "parts": true, 
  "quotes": false,
  "orders": false,
  "customers": true,
  "chats": false,
  "sidebar_sav_types": true,
  "sidebar_sav_statuses": true,
  "sidebar_late_sav": true,
  "statistics": false
}'::jsonb;

-- Add forced features overrides to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS forced_features JSONB DEFAULT '{}'::jsonb;

-- Add individual menu visibility columns to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS menu_dashboard_visible BOOLEAN DEFAULT true;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS menu_sav_visible BOOLEAN DEFAULT true;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS menu_parts_visible BOOLEAN DEFAULT true;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS menu_quotes_visible BOOLEAN DEFAULT true;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS menu_orders_visible BOOLEAN DEFAULT true;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS menu_customers_visible BOOLEAN DEFAULT true;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS menu_chats_visible BOOLEAN DEFAULT true;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS menu_statistics_visible BOOLEAN DEFAULT true;

-- Update existing plans with proper menu configuration based on tier
UPDATE public.subscription_plans 
SET menu_config = '{
  "dashboard": true,
  "sav": true,
  "parts": true,
  "quotes": false,
  "orders": false,
  "customers": true,
  "chats": false,
  "sidebar_sav_types": true,
  "sidebar_sav_statuses": true,
  "sidebar_late_sav": true,
  "statistics": false
}'::jsonb
WHERE LOWER(name) = 'free' OR LOWER(name) = 'gratuit';

UPDATE public.subscription_plans 
SET menu_config = '{
  "dashboard": true,
  "sav": true,
  "parts": true,
  "quotes": true,
  "orders": true,
  "customers": true,
  "chats": true,
  "sidebar_sav_types": true,
  "sidebar_sav_statuses": true,
  "sidebar_late_sav": true,
  "statistics": true
}'::jsonb
WHERE LOWER(name) = 'premium' OR LOWER(name) = 'enterprise';