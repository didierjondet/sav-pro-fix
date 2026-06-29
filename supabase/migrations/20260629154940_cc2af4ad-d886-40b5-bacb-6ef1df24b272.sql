CREATE TABLE public.prospect_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_notes TO authenticated;
GRANT ALL ON public.prospect_notes TO service_role;

ALTER TABLE public.prospect_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view prospect notes"
ON public.prospect_notes FOR SELECT TO authenticated USING (is_super_admin());

CREATE POLICY "Super admins can insert prospect notes"
ON public.prospect_notes FOR INSERT TO authenticated WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update prospect notes"
ON public.prospect_notes FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete prospect notes"
ON public.prospect_notes FOR DELETE TO authenticated USING (is_super_admin());

CREATE INDEX idx_prospect_notes_prospect_id ON public.prospect_notes(prospect_id);
CREATE INDEX idx_prospect_notes_created_at ON public.prospect_notes(created_at DESC);

CREATE TRIGGER update_prospect_notes_updated_at
BEFORE UPDATE ON public.prospect_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();