ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS activity_type text, ADD COLUMN IF NOT EXISTS demo_mode boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS demo_started_at timestamptz;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.sav_cases ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.check_sav_limits_before_insert() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE limits_check jsonb;
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;
  SELECT public.check_subscription_limits_v2(NEW.shop_id, 'sav') INTO limits_check;
  IF NOT (limits_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Limite SAV atteinte: %', limits_check->>'reason';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_monthly_sav_counter() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_demo THEN RETURN NEW; END IF;
  UPDATE public.shops SET monthly_sav_count = monthly_sav_count + 1 WHERE id = NEW.shop_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.seed_demo_shop(_activity text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _shop uuid; _sup uuid; _type text := 'internal';
  _c uuid[] := '{}'; _cid uuid; i int;
  _first text[] := ARRAY['Julie','Karim','Sophie','Thomas','Nadia','Lucas'];
  _last text[]  := ARRAY['Martin','Benali','Durand','Petit','Moreau','Garcia'];
  _devices text[]; _problems text[]; _families text[]; _parts text[]; _prices numeric[];
  _statuses text[] := ARRAY['pending','in_progress','parts_ordered','ready','delivered','in_progress'];
BEGIN
  SELECT shop_id INTO _shop FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1;
  IF _shop IS NULL THEN RAISE EXCEPTION 'Réservé à l''administrateur du magasin'; END IF;
  IF _activity NOT IN ('phone','computer','appliance','console','audio','none') THEN RAISE EXCEPTION 'Activité inconnue'; END IF;

  UPDATE public.shops SET activity_type = _activity WHERE id = _shop;
  IF _activity = 'none' THEN RETURN jsonb_build_object('ok', true, 'demo', false); END IF;
  IF EXISTS (SELECT 1 FROM public.sav_cases WHERE shop_id = _shop AND is_demo = false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'has_real_data');
  END IF;

  CASE _activity
  WHEN 'phone' THEN
    _families := ARRAY['Smartphones','Tablettes','Montres connectées'];
    _devices := ARRAY['Apple|iPhone 13','Samsung|Galaxy S21','Apple|iPhone 11','Xiaomi|Redmi Note 10','Apple|iPad 9','Samsung|Galaxy A52'];
    _problems := ARRAY['Écran cassé suite à une chute','Batterie qui se vide en quelques heures','Ne charge plus, connecteur oxydé','Caméra arrière floue','Vitre tactile ne répond plus','Haut-parleur grésille'];
    _parts := ARRAY['Écran iPhone 13 OLED','Batterie iPhone 11','Connecteur de charge Galaxy S21','Vitre arrière iPhone 13'];
    _prices := ARRAY[89,25,12,18];
  WHEN 'computer' THEN
    _families := ARRAY['PC portables','PC fixes','Imprimantes'];
    _devices := ARRAY['HP|Pavilion 15','Dell|Inspiron 14','Apple|MacBook Air M1','Lenovo|IdeaPad 3','Asus|VivoBook','Acer|Aspire 5'];
    _problems := ARRAY['PC très lent au démarrage','Écran noir, ne s''allume plus','Clavier : plusieurs touches HS','Surchauffe et ventilateur bruyant','Virus / publicités intempestives','Disque dur qui claque'];
    _parts := ARRAY['SSD 512 Go','Barrette RAM 8 Go','Clavier HP Pavilion 15','Chargeur universel 65 W'];
    _prices := ARRAY[35,22,28,15];
  WHEN 'appliance' THEN
    _families := ARRAY['Lavage','Froid','Cuisson','Petit électroménager'];
    _devices := ARRAY['Bosch|Lave-linge Serie 4','Whirlpool|Réfrigérateur W7','Samsung|Lave-vaisselle DW60','Electrolux|Four EOF','Brandt|Sèche-linge','Moulinex|Robot Companion'];
    _problems := ARRAY['Fuite d''eau sous la machine','Ne fait plus de froid','N''évacue plus l''eau','Le four ne chauffe plus','Tambour ne tourne plus','Ne s''allume plus'];
    _parts := ARRAY['Pompe de vidange','Thermostat réfrigérateur','Résistance four','Courroie tambour'];
    _prices := ARRAY[24,18,30,9];
  WHEN 'console' THEN
    _families := ARRAY['Consoles de salon','Consoles portables','Manettes'];
    _devices := ARRAY['Sony|PS5','Nintendo|Switch OLED','Microsoft|Xbox Series X','Sony|Manette DualSense','Nintendo|Joy-Con','Sony|PS4 Pro'];
    _problems := ARRAY['Surchauffe et extinction','Joy-Con qui dérive','Lecteur ne lit plus les disques','Joystick qui dérive','Ne se connecte plus','Port HDMI endommagé'];
    _parts := ARRAY['Joystick analogique','Port HDMI PS5','Pâte thermique','Lecteur Blu-ray PS4'];
    _prices := ARRAY[6,9,4,35];
  ELSE -- audio
    _families := ARRAY['Enceintes','Casques','Amplificateurs','Platines'];
    _devices := ARRAY['JBL|Charge 5','Bose|QuietComfort 45','Marshall|Stanmore II','Sony|WH-1000XM4','Yamaha|Ampli A-S501','Technics|SL-1200'];
    _problems := ARRAY['Plus de son d''un côté','Batterie ne tient plus','Grésillement à fort volume','Bluetooth ne se connecte plus','Ampli se met en protection','Plateau ne tourne plus'];
    _parts := ARRAY['Haut-parleur 40 mm','Batterie enceinte JBL','Module Bluetooth','Courroie platine'];
    _prices := ARRAY[14,19,11,7];
  END CASE;

  INSERT INTO public.product_families (shop_id, name, display_order)
  SELECT _shop, f, 100 + ord FROM unnest(_families) WITH ORDINALITY AS u(f, ord)
  WHERE NOT EXISTS (SELECT 1 FROM public.product_families pf WHERE pf.shop_id = _shop AND lower(pf.name) = lower(f));

  INSERT INTO public.suppliers (shop_id, name, notes, is_demo)
  VALUES (_shop, 'Fournisseur Exemple', 'Fournisseur fictif du mode découverte', true) RETURNING id INTO _sup;

  INSERT INTO public.parts (shop_id, name, reference, purchase_price, selling_price, quantity, min_stock, supplier_id, is_demo)
  SELECT _shop, p, 'DEMO-' || ord, _prices[ord], round(_prices[ord] * 2.2), CASE WHEN ord = 1 THEN 0 ELSE 3 END, 1, _sup, true
  FROM unnest(_parts) WITH ORDINALITY AS u(p, ord);

  SELECT type_key INTO _type FROM public.shop_sav_types WHERE shop_id = _shop AND is_active ORDER BY display_order LIMIT 1;

  FOR i IN 1..6 LOOP
    INSERT INTO public.customers (shop_id, first_name, last_name, phone, email, is_demo)
    VALUES (_shop, _first[i], _last[i] || ' (exemple)', '0600000' || lpad(i::text, 3, '0'), NULL, true) RETURNING id INTO _cid;
    INSERT INTO public.sav_cases (shop_id, customer_id, sav_type, status, device_brand, device_model, problem_description, is_demo, created_at)
    VALUES (_shop, _cid, coalesce(_type, 'internal'), _statuses[i], split_part(_devices[i], '|', 1), split_part(_devices[i], '|', 2), _problems[i], true, now() - ((7 - i) || ' days')::interval);
  END LOOP;

  UPDATE public.shops SET demo_mode = true, demo_started_at = now() WHERE id = _shop;
  RETURN jsonb_build_object('ok', true, 'demo', true);
END; $$;

CREATE OR REPLACE FUNCTION public.exit_demo_mode(_keep_parts boolean DEFAULT false, _keep_suppliers boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1;
  IF _shop IS NULL THEN RAISE EXCEPTION 'Réservé à l''administrateur du magasin'; END IF;
  DELETE FROM public.sav_messages WHERE sav_case_id IN (SELECT id FROM public.sav_cases WHERE shop_id = _shop AND is_demo);
  DELETE FROM public.sav_cases WHERE shop_id = _shop AND is_demo;
  DELETE FROM public.customers WHERE shop_id = _shop AND is_demo;
  IF _keep_parts THEN UPDATE public.parts SET is_demo = false WHERE shop_id = _shop AND is_demo;
  ELSE DELETE FROM public.parts WHERE shop_id = _shop AND is_demo; END IF;
  IF _keep_suppliers THEN UPDATE public.suppliers SET is_demo = false WHERE shop_id = _shop AND is_demo;
  ELSE UPDATE public.parts SET supplier_id = NULL WHERE shop_id = _shop AND supplier_id IN (SELECT id FROM public.suppliers WHERE shop_id = _shop AND is_demo);
       DELETE FROM public.suppliers WHERE shop_id = _shop AND is_demo; END IF;
  UPDATE public.shops SET demo_mode = false WHERE id = _shop;
  RETURN jsonb_build_object('ok', true);
END; $$;

REVOKE EXECUTE ON FUNCTION public.seed_demo_shop(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.exit_demo_mode(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_demo_shop(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exit_demo_mode(boolean, boolean) TO authenticated;