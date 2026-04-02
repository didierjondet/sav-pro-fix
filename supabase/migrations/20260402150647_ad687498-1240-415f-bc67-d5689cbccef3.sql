
CREATE TABLE public.help_bot_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[] DEFAULT '{}',
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.help_bot_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge" ON public.help_bot_knowledge
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access" ON public.help_bot_knowledge
  FOR ALL TO service_role USING (true);
