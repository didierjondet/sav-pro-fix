-- Créer une fonction pour convertir automatiquement les devis acceptés en clients
CREATE OR REPLACE FUNCTION public.convert_accepted_quote_to_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_customer_id uuid;
  new_customer_id uuid;
BEGIN
  -- Vérifier si le statut a changé vers 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    -- Vérifier si un client avec cet email existe déjà dans ce magasin
    SELECT id INTO existing_customer_id
    FROM public.customers
    WHERE shop_id = NEW.shop_id 
    AND email = NEW.customer_email
    AND NEW.customer_email IS NOT NULL
    LIMIT 1;
    
    -- Si aucun client existe avec cet email, créer un nouveau client
    IF existing_customer_id IS NULL THEN
      -- Extraire le prénom et nom du customer_name
      -- Par défaut, on prend le premier mot comme prénom et le reste comme nom
      DECLARE
        name_parts text[];
        first_name text;
        last_name text;
      BEGIN
        name_parts := string_to_array(trim(NEW.customer_name), ' ');
        
        IF array_length(name_parts, 1) >= 1 THEN
          first_name := name_parts[1];
        ELSE
          first_name := 'Client';
        END IF;
        
        IF array_length(name_parts, 1) >= 2 THEN
          last_name := array_to_string(name_parts[2:], ' ');
        ELSE
          last_name := 'Devis';
        END IF;
        
        -- Créer le nouveau client
        INSERT INTO public.customers (
          shop_id,
          first_name,
          last_name,
          email,
          phone
        ) VALUES (
          NEW.shop_id,
          first_name,
          last_name,
          NEW.customer_email,
          NEW.customer_phone
        ) RETURNING id INTO new_customer_id;
        
        -- Log de la création
        RAISE NOTICE 'Client créé automatiquement: % (ID: %) pour le devis accepté %', 
          NEW.customer_name, new_customer_id, NEW.quote_number;
          
      END;
    ELSE
      -- Log si le client existe déjà
      RAISE NOTICE 'Client existant trouvé: % pour le devis accepté %', 
        existing_customer_id, NEW.quote_number;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger qui se déclenche lors de la mise à jour des devis
CREATE TRIGGER trigger_convert_accepted_quote_to_customer
  AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.convert_accepted_quote_to_customer();

-- Ajouter un commentaire pour documenter le trigger
COMMENT ON TRIGGER trigger_convert_accepted_quote_to_customer ON public.quotes IS 
'Convertit automatiquement les devis acceptés en clients dans la table customers';