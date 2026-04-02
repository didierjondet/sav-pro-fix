
-- Table pour les FAQ du HelpBot
CREATE TABLE public.help_bot_faq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.help_bot_faq ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les questions globales (shop_id IS NULL)
CREATE POLICY "Anyone can view global FAQ"
  ON public.help_bot_faq FOR SELECT
  USING (shop_id IS NULL);

-- Les utilisateurs authentifiés peuvent voir les FAQ de leur shop
CREATE POLICY "Shop users can view their FAQ"
  ON public.help_bot_faq FOR SELECT
  TO authenticated
  USING (shop_id = get_current_user_shop_id());

-- Les utilisateurs authentifiés peuvent incrémenter click_count
CREATE POLICY "Authenticated users can update FAQ click count"
  ON public.help_bot_faq FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Super admins peuvent tout gérer
CREATE POLICY "Super admins can manage all FAQ"
  ON public.help_bot_faq FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Seed avec les questions initiales globales
INSERT INTO public.help_bot_faq (question, category, click_count) VALUES
  ('Comment créer un dossier SAV ?', 'sav', 0),
  ('Comment ajouter une pièce au stock ?', 'pieces', 0),
  ('Comment configurer mon profil ?', 'configuration', 0),
  ('Comment envoyer un SMS à un client ?', 'sms', 0),
  ('Comment créer un devis ?', 'devis', 0),
  ('Comment consulter mes statistiques ?', 'statistiques', 0);
