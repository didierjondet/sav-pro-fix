-- Ajouter les colonnes pour traquer qui a accepté le devis et quand
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS accepted_by TEXT,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sav_case_id UUID REFERENCES public.sav_cases(id) ON DELETE SET NULL;

-- Créer une fonction pour marquer le devis comme terminé quand le SAV est livré
CREATE OR REPLACE FUNCTION public.mark_quote_completed_on_sav_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un SAV passe au statut 'ready' (livré), marquer le devis associé comme 'completed'
  IF NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready') THEN
    UPDATE public.quotes 
    SET status = 'completed'
    WHERE sav_case_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour surveiller les changements de statut SAV
DROP TRIGGER IF EXISTS trigger_mark_quote_completed ON public.sav_cases;
CREATE TRIGGER trigger_mark_quote_completed
  AFTER UPDATE ON public.sav_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_quote_completed_on_sav_delivery();