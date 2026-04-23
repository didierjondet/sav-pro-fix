-- Create prospects table to collect leads from public landing page
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  interested_in_beta BOOLEAN NOT NULL DEFAULT false,
  interested_in_recontact BOOLEAN NOT NULL DEFAULT false,
  interested_in_demo BOOLEAN NOT NULL DEFAULT false,
  free_message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Public can insert (anonymous form submission from landing page)
CREATE POLICY "Anyone can submit a prospect form"
ON public.prospects
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only super admins can read
CREATE POLICY "Super admins can view all prospects"
ON public.prospects
FOR SELECT
TO authenticated
USING (is_super_admin());

-- Only super admins can update
CREATE POLICY "Super admins can update prospects"
ON public.prospects
FOR UPDATE
TO authenticated
USING (is_super_admin());

-- Only super admins can delete
CREATE POLICY "Super admins can delete prospects"
ON public.prospects
FOR DELETE
TO authenticated
USING (is_super_admin());

-- Trigger to auto-update updated_at
CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_prospects_status ON public.prospects(status);
CREATE INDEX idx_prospects_created_at ON public.prospects(created_at DESC);