-- Créer une table pour tracker les visites des pages SAV par les clients
CREATE TABLE public.sav_tracking_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sav_case_id uuid NOT NULL,
  tracking_slug text NOT NULL,
  visitor_ip text,
  visitor_user_agent text,
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_sav_tracking_visits_sav_case_id ON public.sav_tracking_visits(sav_case_id);
CREATE INDEX idx_sav_tracking_visits_tracking_slug ON public.sav_tracking_visits(tracking_slug);
CREATE INDEX idx_sav_tracking_visits_visited_at ON public.sav_tracking_visits(visited_at);

-- RLS: Permettre aux utilisateurs de voir les visites de leurs SAV
ALTER TABLE public.sav_tracking_visits ENABLE ROW LEVEL SECURITY;

-- Policy pour que les utilisateurs du shop puissent voir les visites de leurs SAV
CREATE POLICY "Shop users can view their SAV visits" 
ON public.sav_tracking_visits 
FOR SELECT 
USING (sav_case_id IN (
  SELECT id FROM public.sav_cases 
  WHERE shop_id = get_current_user_shop_id()
));

-- Policy pour permettre l'insertion publique lors des visites de tracking
CREATE POLICY "Public can insert tracking visits" 
ON public.sav_tracking_visits 
FOR INSERT 
WITH CHECK (
  sav_case_id IN (
    SELECT id FROM public.sav_cases 
    WHERE tracking_slug IS NOT NULL AND tracking_slug != ''
  )
);

-- Super admins peuvent tout voir
CREATE POLICY "Super admins can manage all SAV visits" 
ON public.sav_tracking_visits 
FOR ALL 
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Fonction pour enregistrer une visite
CREATE OR REPLACE FUNCTION public.record_sav_visit(
  p_tracking_slug text,
  p_visitor_ip text DEFAULT NULL,
  p_visitor_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_sav_case_id uuid;
  v_last_visit timestamp with time zone;
BEGIN
  -- Récupérer l'ID du SAV case via le tracking slug
  SELECT id INTO v_sav_case_id
  FROM public.sav_cases
  WHERE tracking_slug = p_tracking_slug
  AND tracking_slug IS NOT NULL 
  AND tracking_slug != '';
  
  IF v_sav_case_id IS NULL THEN
    RETURN; -- Slug invalide, on n'enregistre pas
  END IF;
  
  -- Vérifier s'il y a déjà eu une visite récente (dans les 30 minutes) avec la même IP
  -- pour éviter de compter plusieurs fois la même session
  SELECT visited_at INTO v_last_visit
  FROM public.sav_tracking_visits
  WHERE sav_case_id = v_sav_case_id
  AND visitor_ip = p_visitor_ip
  AND visited_at > (NOW() - INTERVAL '30 minutes')
  ORDER BY visited_at DESC
  LIMIT 1;
  
  -- Si pas de visite récente, enregistrer cette visite
  IF v_last_visit IS NULL THEN
    INSERT INTO public.sav_tracking_visits (
      sav_case_id,
      tracking_slug,
      visitor_ip,
      visitor_user_agent
    ) VALUES (
      v_sav_case_id,
      p_tracking_slug,
      p_visitor_ip,
      p_visitor_user_agent
    );
  END IF;
END;
$$;

COMMENT ON TABLE public.sav_tracking_visits IS 'Enregistre les visites des clients sur les pages de suivi SAV';
COMMENT ON FUNCTION public.record_sav_visit IS 'Enregistre une visite sur une page de tracking SAV (évite les doublons sur 30 min)';