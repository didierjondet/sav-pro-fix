-- Add AI modules configuration to shops table
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS ai_market_prices_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_modules_config jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.shops.ai_market_prices_enabled IS 'Enable AI-powered market price estimation for parts';
COMMENT ON COLUMN public.shops.ai_modules_config IS 'Configuration for various AI modules (extensible for future modules)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shops_ai_market_prices_enabled ON public.shops(ai_market_prices_enabled) WHERE ai_market_prices_enabled = true;