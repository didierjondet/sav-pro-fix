-- Ajouter un champ tracking_slug à la table sav_cases pour les liens de suivi simplifiés
ALTER TABLE public.sav_cases 
ADD COLUMN tracking_slug TEXT UNIQUE;

-- Créer une fonction pour générer un slug de suivi unique
CREATE OR REPLACE FUNCTION public.generate_tracking_slug(customer_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
  random_number integer;
BEGIN
  -- Nettoyer le nom du client et créer un slug de base
  base_slug := lower(regexp_replace(customer_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '', 'g');
  base_slug := trim(base_slug);
  
  -- Limiter à 10 caractères maximum
  IF length(base_slug) > 10 THEN
    base_slug := substr(base_slug, 1, 10);
  END IF;
  
  -- S'assurer qu'il y a au moins un caractère
  IF base_slug = '' THEN
    base_slug := 'client';
  END IF;
  
  -- Générer un nombre aléatoire entre 100 et 9999
  random_number := floor(random() * 9900 + 100)::integer;
  final_slug := base_slug || random_number;
  
  -- Vérifier l'unicité et incrémenter si nécessaire
  WHILE EXISTS (SELECT 1 FROM public.sav_cases WHERE tracking_slug = final_slug) LOOP
    random_number := floor(random() * 9900 + 100)::integer;
    final_slug := base_slug || random_number;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Trigger pour auto-générer le tracking_slug à la création
CREATE OR REPLACE FUNCTION public.set_tracking_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  customer_name text;
BEGIN
  -- Récupérer le nom du client
  SELECT CONCAT(c.first_name, c.last_name) INTO customer_name
  FROM public.customers c
  WHERE c.id = NEW.customer_id;
  
  -- Si pas de client trouvé, utiliser un nom par défaut
  IF customer_name IS NULL OR customer_name = '' THEN
    customer_name := 'client';
  END IF;
  
  -- Générer le slug seulement si pas déjà défini
  IF NEW.tracking_slug IS NULL OR NEW.tracking_slug = '' THEN
    NEW.tracking_slug := generate_tracking_slug(customer_name);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
CREATE TRIGGER trigger_set_tracking_slug
  BEFORE INSERT ON public.sav_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tracking_slug();

-- Mettre à jour les SAV existants pour générer des slugs
UPDATE public.sav_cases 
SET tracking_slug = generate_tracking_slug('client' || RIGHT(id::text, 4))
WHERE tracking_slug IS NULL;