
-- Table for multi-provider SMS and Email configuration
CREATE TABLE public.messaging_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('sms', 'email')),
  provider text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  encrypted_config jsonb DEFAULT NULL,
  from_address text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one active provider per type
CREATE UNIQUE INDEX idx_one_active_provider_per_type ON public.messaging_providers (type) WHERE is_active = true;

-- RLS
ALTER TABLE public.messaging_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view messaging providers"
ON public.messaging_providers FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert messaging providers"
ON public.messaging_providers FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update messaging providers"
ON public.messaging_providers FOR UPDATE
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admins can delete messaging providers"
ON public.messaging_providers FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- Auto-update updated_at
CREATE TRIGGER update_messaging_providers_updated_at
BEFORE UPDATE ON public.messaging_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_carousel_items_updated_at();
