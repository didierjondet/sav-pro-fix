-- Ajouter un code d'invitation court pour les magasins (8 caractères)

-- Ajouter la colonne invite_code
ALTER TABLE public.shops ADD COLUMN invite_code TEXT UNIQUE;

-- Fonction pour générer un code aléatoire de 8 caractères (lettres et chiffres)
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  code := '';
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  -- Vérifier que le code n'existe pas déjà
  WHILE EXISTS (SELECT 1 FROM public.shops WHERE invite_code = code) LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement un code d'invitation
CREATE OR REPLACE FUNCTION public.set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invite_code
  BEFORE INSERT OR UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invite_code();

-- Générer des codes pour les magasins existants
UPDATE public.shops SET invite_code = generate_invite_code() WHERE invite_code IS NULL;