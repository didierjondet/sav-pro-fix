-- Create table for shop statistics configuration
CREATE TABLE public.shop_statistics_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  modules_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_statistics_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Shop users can manage their statistics config"
ON public.shop_statistics_config
FOR ALL
USING (shop_id IN (
  SELECT shop_id FROM profiles WHERE user_id = auth.uid()
))
WITH CHECK (shop_id IN (
  SELECT shop_id FROM profiles WHERE user_id = auth.uid()
));

-- Create unique constraint
ALTER TABLE public.shop_statistics_config 
ADD CONSTRAINT shop_statistics_config_shop_id_key UNIQUE (shop_id);

-- Create trigger for updated_at
CREATE TRIGGER update_shop_statistics_config_updated_at
  BEFORE UPDATE ON public.shop_statistics_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();