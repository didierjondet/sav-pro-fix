
-- Table de configuration du moteur IA
CREATE TABLE public.ai_engine_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'lovable' CHECK (provider IN ('lovable', 'openai', 'gemini')),
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  api_key_name TEXT NOT NULL DEFAULT 'LOVABLE_API_KEY',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Un seul enregistrement actif à la fois
CREATE UNIQUE INDEX idx_ai_engine_config_active ON public.ai_engine_config (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.ai_engine_config ENABLE ROW LEVEL SECURITY;

-- Super admins only
CREATE POLICY "Super admins can read ai_engine_config"
ON public.ai_engine_config FOR SELECT
USING (public.is_super_admin());

CREATE POLICY "Super admins can insert ai_engine_config"
ON public.ai_engine_config FOR INSERT
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update ai_engine_config"
ON public.ai_engine_config FOR UPDATE
USING (public.is_super_admin());

CREATE POLICY "Super admins can delete ai_engine_config"
ON public.ai_engine_config FOR DELETE
USING (public.is_super_admin());

-- Trigger updated_at
CREATE TRIGGER update_ai_engine_config_updated_at
BEFORE UPDATE ON public.ai_engine_config
FOR EACH ROW
EXECUTE FUNCTION public.update_custom_widgets_updated_at();

-- Insérer la config par défaut (Lovable AI)
INSERT INTO public.ai_engine_config (provider, model, api_key_name, is_active)
VALUES ('lovable', 'google/gemini-2.5-flash', 'LOVABLE_API_KEY', true);
