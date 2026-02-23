
ALTER TABLE public.ai_engine_config ADD COLUMN encrypted_api_key text;

-- Only super admins can access this table (already has RLS or is service-role only)
COMMENT ON COLUMN public.ai_engine_config.encrypted_api_key IS 'Stores the API key for external AI providers';
