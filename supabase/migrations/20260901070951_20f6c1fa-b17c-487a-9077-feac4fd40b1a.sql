
-- 1. Partner code on shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS partner_code TEXT,
  ADD COLUMN IF NOT EXISTS partner_directory_opt_in BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.generate_partner_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  i INT;
BEGIN
  LOOP
    candidate := 'FW-';
    FOR i IN 1..4 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    candidate := candidate || '-';
    FOR i IN 1..4 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.shops WHERE partner_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

UPDATE public.shops SET partner_code = public.generate_partner_code() WHERE partner_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shops_partner_code_key ON public.shops (partner_code);

CREATE OR REPLACE FUNCTION public.set_partner_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.partner_code IS NULL OR NEW.partner_code = '' THEN
    NEW.partner_code := public.generate_partner_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shops_set_partner_code ON public.shops;
CREATE TRIGGER shops_set_partner_code
  BEFORE INSERT ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.set_partner_code();

-- 2. Partner profiles
CREATE TABLE IF NOT EXISTS public.partner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  slug TEXT UNIQUE,
  public_name TEXT NOT NULL,
  logo_url TEXT,
  city TEXT,
  postal_code TEXT,
  coverage_area TEXT,
  public_phone TEXT,
  public_email TEXT,
  website_url TEXT,
  description TEXT,
  specialties TEXT,
  certifications TEXT,
  warranty_terms TEXT,
  shipping_modes TEXT,
  avg_delay_days INTEGER,
  return_policy TEXT,
  failure_policy TEXT,
  prices_include_vat BOOLEAN NOT NULL DEFAULT true,
  vat_rate NUMERIC NOT NULL DEFAULT 20,
  vat_exempt BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_profiles TO authenticated;
GRANT ALL ON public.partner_profiles TO service_role;
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shops manage their own partner profile"
  ON public.partner_profiles FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Authenticated users can view published partner profiles"
  ON public.partner_profiles FOR SELECT TO authenticated
  USING (is_published = true);

CREATE TRIGGER partner_profiles_updated_at
  BEFORE UPDATE ON public.partner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- slug generation
CREATE OR REPLACE FUNCTION public.set_partner_profile_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := lower(regexp_replace(unaccent_fallback(NEW.public_name), '[^a-zA-Z0-9]+', '-', 'g'));
    base := trim(both '-' from base);
    IF base = '' THEN base := 'partenaire'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.partner_profiles WHERE slug = candidate AND id <> NEW.id) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.unaccent_fallback(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate($1,
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
    'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY');
$$;

DROP TRIGGER IF EXISTS partner_profiles_set_slug ON public.partner_profiles;
CREATE TRIGGER partner_profiles_set_slug
  BEFORE INSERT OR UPDATE ON public.partner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_partner_profile_slug();

-- 3. Price grid
CREATE TABLE IF NOT EXISTS public.partner_price_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  device_family TEXT,
  public_price NUMERIC,
  pro_price NUMERIC,
  delay_days INTEGER,
  note TEXT,
  visible_public BOOLEAN NOT NULL DEFAULT true,
  visible_pro BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_price_items TO authenticated;
GRANT ALL ON public.partner_price_items TO service_role;
ALTER TABLE public.partner_price_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shops manage their own price items"
  ON public.partner_price_items FOR ALL TO authenticated
  USING (shop_id = public.get_current_user_shop_id())
  WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Authenticated users can view pro price items of published profiles"
  ON public.partner_price_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.partner_profiles pp
    WHERE pp.id = partner_price_items.profile_id AND pp.is_published = true
  ));

CREATE TRIGGER partner_price_items_updated_at
  BEFORE UPDATE ON public.partner_price_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Provider link
ALTER TABLE public.shop_sav_providers
  ADD COLUMN IF NOT EXISTS linked_shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;

-- 5. SAV shares
CREATE TABLE IF NOT EXISTS public.sav_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sav_case_id UUID NOT NULL REFERENCES public.sav_cases(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.sav_provider_assignments(id) ON DELETE SET NULL,
  owner_shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  partner_shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sav_shares_partner_idx ON public.sav_shares (partner_shop_id, status);
CREATE INDEX IF NOT EXISTS sav_shares_case_idx ON public.sav_shares (sav_case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sav_shares TO authenticated;
GRANT ALL ON public.sav_shares TO service_role;
ALTER TABLE public.sav_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner shop manages shares"
  ON public.sav_shares FOR ALL TO authenticated
  USING (owner_shop_id = public.get_current_user_shop_id())
  WITH CHECK (owner_shop_id = public.get_current_user_shop_id());

CREATE POLICY "Partner shop can view its shares"
  ON public.sav_shares FOR SELECT TO authenticated
  USING (partner_shop_id = public.get_current_user_shop_id());

CREATE TRIGGER sav_shares_updated_at
  BEFORE UPDATE ON public.sav_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Inter-shop messages
CREATE TABLE IF NOT EXISTS public.sav_share_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES public.sav_shares(id) ON DELETE CASCADE,
  sender_shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sender_user_id UUID,
  sender_name TEXT,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sav_share_messages_share_idx ON public.sav_share_messages (share_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sav_share_messages TO authenticated;
GRANT ALL ON public.sav_share_messages TO service_role;
ALTER TABLE public.sav_share_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Both shops can read share messages"
  ON public.sav_share_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sav_shares s
    WHERE s.id = sav_share_messages.share_id
      AND public.get_current_user_shop_id() IN (s.owner_shop_id, s.partner_shop_id)
  ));

CREATE POLICY "Both shops can write share messages"
  ON public.sav_share_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_shop_id = public.get_current_user_shop_id()
    AND EXISTS (
      SELECT 1 FROM public.sav_shares s
      WHERE s.id = sav_share_messages.share_id
        AND public.get_current_user_shop_id() IN (s.owner_shop_id, s.partner_shop_id)
    )
  );

CREATE POLICY "Both shops can mark share messages read"
  ON public.sav_share_messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sav_shares s
    WHERE s.id = sav_share_messages.share_id
      AND public.get_current_user_shop_id() IN (s.owner_shop_id, s.partner_shop_id)
  ));

CREATE TRIGGER sav_share_messages_updated_at
  BEFORE UPDATE ON public.sav_share_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.sav_share_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sav_shares;

-- 7. Auto share on provider assignment
CREATE OR REPLACE FUNCTION public.sync_sav_share_from_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked_shop UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.sav_shares
       SET status = 'closed', ended_at = COALESCE(ended_at, now())
     WHERE assignment_id = OLD.id AND status = 'active';
    RETURN OLD;
  END IF;

  SELECT linked_shop_id INTO v_linked_shop
    FROM public.shop_sav_providers WHERE id = NEW.provider_id;

  IF v_linked_shop IS NULL OR v_linked_shop = NEW.shop_id THEN
    UPDATE public.sav_shares
       SET status = 'closed', ended_at = COALESCE(ended_at, now())
     WHERE assignment_id = NEW.id AND status = 'active';
    RETURN NEW;
  END IF;

  IF NEW.returned_at IS NOT NULL THEN
    UPDATE public.sav_shares
       SET status = 'closed', ended_at = COALESCE(ended_at, NEW.returned_at)
     WHERE assignment_id = NEW.id AND status = 'active';
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sav_shares WHERE assignment_id = NEW.id AND status = 'active') THEN
    INSERT INTO public.sav_shares (sav_case_id, assignment_id, owner_shop_id, partner_shop_id, started_at)
    VALUES (NEW.sav_case_id, NEW.id, NEW.shop_id, v_linked_shop, COALESCE(NEW.sent_at, now()));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sav_provider_assignments_share ON public.sav_provider_assignments;
CREATE TRIGGER sav_provider_assignments_share
  AFTER INSERT OR UPDATE OR DELETE ON public.sav_provider_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_sav_share_from_assignment();

-- when a provider is unlinked, close its active shares
CREATE OR REPLACE FUNCTION public.close_shares_on_provider_unlink()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.linked_shop_id IS NOT NULL AND (NEW.linked_shop_id IS NULL OR NEW.linked_shop_id <> OLD.linked_shop_id) THEN
    UPDATE public.sav_shares s
       SET status = 'closed', ended_at = COALESCE(s.ended_at, now())
     WHERE s.status = 'active'
       AND s.partner_shop_id = OLD.linked_shop_id
       AND s.assignment_id IN (SELECT id FROM public.sav_provider_assignments WHERE provider_id = OLD.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shop_sav_providers_unlink ON public.shop_sav_providers;
CREATE TRIGGER shop_sav_providers_unlink
  AFTER UPDATE ON public.shop_sav_providers
  FOR EACH ROW EXECUTE FUNCTION public.close_shares_on_provider_unlink();

-- 8. Partner code resolution
CREATE OR REPLACE FUNCTION public.resolve_partner_code(_code TEXT)
RETURNS TABLE (shop_id UUID, shop_name TEXT, public_name TEXT, city TEXT, specialties TEXT, is_published BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, pp.public_name, pp.city, pp.specialties, COALESCE(pp.is_published, false)
    FROM public.shops s
    LEFT JOIN public.partner_profiles pp ON pp.shop_id = s.id
   WHERE upper(trim(_code)) = s.partner_code
     AND s.id <> COALESCE(public.get_current_user_shop_id(), '00000000-0000-0000-0000-000000000000'::uuid)
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_partner_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_partner_code(TEXT) TO authenticated;

-- 9. Shared SAV cases for the partner (no customer data, no sale prices)
CREATE OR REPLACE FUNCTION public.get_shared_sav_cases()
RETURNS TABLE (
  share_id UUID,
  sav_case_id UUID,
  case_number TEXT,
  owner_shop_id UUID,
  owner_shop_name TEXT,
  device_brand TEXT,
  device_model TEXT,
  device_color TEXT,
  device_imei TEXT,
  sku TEXT,
  accessories JSONB,
  problem_description TEXT,
  status TEXT,
  sent_at TIMESTAMPTZ,
  reason TEXT,
  external_ref TEXT,
  cost NUMERIC,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sh.id,
    c.id,
    c.case_number,
    sh.owner_shop_id,
    os.name,
    c.device_brand,
    c.device_model,
    c.device_color,
    c.device_imei,
    c.sku,
    to_jsonb(c.accessories),
    c.problem_description,
    c.status::text,
    sh.started_at,
    a.reason,
    a.external_ref,
    a.cost,
    (SELECT count(*) FROM public.sav_share_messages m
      WHERE m.share_id = sh.id AND m.read_at IS NULL
        AND m.sender_shop_id <> sh.partner_shop_id)
  FROM public.sav_shares sh
  JOIN public.sav_cases c ON c.id = sh.sav_case_id
  JOIN public.shops os ON os.id = sh.owner_shop_id
  LEFT JOIN public.sav_provider_assignments a ON a.id = sh.assignment_id
  WHERE sh.partner_shop_id = public.get_current_user_shop_id()
  ORDER BY sh.status = 'active' DESC, sh.started_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_shared_sav_cases() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_sav_cases() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_sav_case(_share_id UUID)
RETURNS TABLE (
  share_id UUID,
  sav_case_id UUID,
  case_number TEXT,
  status TEXT,
  share_status TEXT,
  owner_shop_name TEXT,
  owner_shop_phone TEXT,
  owner_shop_email TEXT,
  device_brand TEXT,
  device_model TEXT,
  device_color TEXT,
  device_imei TEXT,
  sku TEXT,
  accessories JSONB,
  problem_description TEXT,
  technician_comments TEXT,
  unlock_pattern TEXT,
  security_codes JSONB,
  ai_diagnostic TEXT,
  attachments JSONB,
  sent_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  reason TEXT,
  external_ref TEXT,
  cost NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sh.id,
    c.id,
    c.case_number,
    c.status::text,
    sh.status,
    os.name,
    os.phone,
    os.email,
    c.device_brand,
    c.device_model,
    c.device_color,
    c.device_imei,
    c.sku,
    to_jsonb(c.accessories),
    c.problem_description,
    c.technician_comments,
    c.unlock_pattern,
    to_jsonb(c.security_codes),
    c.ai_diagnostic,
    to_jsonb(c.attachments),
    sh.started_at,
    a.returned_at,
    a.reason,
    a.external_ref,
    a.cost
  FROM public.sav_shares sh
  JOIN public.sav_cases c ON c.id = sh.sav_case_id
  JOIN public.shops os ON os.id = sh.owner_shop_id
  LEFT JOIN public.sav_provider_assignments a ON a.id = sh.assignment_id
  WHERE sh.id = _share_id
    AND public.get_current_user_shop_id() IN (sh.partner_shop_id, sh.owner_shop_id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_sav_case(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_sav_case(UUID) TO authenticated;

-- 10. Public directory
CREATE OR REPLACE FUNCTION public.get_public_partner_directory(_search TEXT DEFAULT NULL)
RETURNS TABLE (
  slug TEXT,
  public_name TEXT,
  logo_url TEXT,
  city TEXT,
  postal_code TEXT,
  coverage_area TEXT,
  description TEXT,
  specialties TEXT,
  avg_delay_days INTEGER,
  certifications TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pp.slug, pp.public_name, pp.logo_url, pp.city, pp.postal_code, pp.coverage_area,
         pp.description, pp.specialties, pp.avg_delay_days, pp.certifications
    FROM public.partner_profiles pp
    JOIN public.shops s ON s.id = pp.shop_id
   WHERE pp.is_published = true AND s.partner_directory_opt_in = true
     AND (
       _search IS NULL OR _search = '' OR
       pp.public_name ILIKE '%' || _search || '%' OR
       COALESCE(pp.city,'') ILIKE '%' || _search || '%' OR
       COALESCE(pp.postal_code,'') ILIKE '%' || _search || '%' OR
       COALESCE(pp.specialties,'') ILIKE '%' || _search || '%' OR
       COALESCE(pp.description,'') ILIKE '%' || _search || '%'
     )
   ORDER BY pp.public_name;
$$;

REVOKE ALL ON FUNCTION public.get_public_partner_directory(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_partner_directory(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_partner(_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'slug', pp.slug,
    'public_name', pp.public_name,
    'logo_url', pp.logo_url,
    'city', pp.city,
    'postal_code', pp.postal_code,
    'coverage_area', pp.coverage_area,
    'public_phone', pp.public_phone,
    'public_email', pp.public_email,
    'website_url', pp.website_url,
    'description', pp.description,
    'specialties', pp.specialties,
    'certifications', pp.certifications,
    'warranty_terms', pp.warranty_terms,
    'shipping_modes', pp.shipping_modes,
    'avg_delay_days', pp.avg_delay_days,
    'return_policy', pp.return_policy,
    'failure_policy', pp.failure_policy,
    'prices_include_vat', pp.prices_include_vat,
    'vat_rate', pp.vat_rate,
    'vat_exempt', pp.vat_exempt,
    'prices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'label', pi.label,
        'device_family', pi.device_family,
        'price', pi.public_price,
        'delay_days', pi.delay_days,
        'note', pi.note
      ) ORDER BY pi.display_order, pi.label)
      FROM public.partner_price_items pi
      WHERE pi.profile_id = pp.id AND pi.visible_public = true AND pi.public_price IS NOT NULL
    ), '[]'::jsonb)
  )
  FROM public.partner_profiles pp
  JOIN public.shops s ON s.id = pp.shop_id
  WHERE pp.slug = _slug AND pp.is_published = true AND s.partner_directory_opt_in = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_partner(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_partner(TEXT) TO anon, authenticated;

-- 11. Pro directory (authenticated shops only)
CREATE OR REPLACE FUNCTION public.get_pro_partner_directory(_search TEXT DEFAULT NULL)
RETURNS TABLE (
  shop_id UUID,
  partner_code TEXT,
  slug TEXT,
  public_name TEXT,
  logo_url TEXT,
  city TEXT,
  postal_code TEXT,
  coverage_area TEXT,
  public_phone TEXT,
  public_email TEXT,
  description TEXT,
  specialties TEXT,
  certifications TEXT,
  warranty_terms TEXT,
  shipping_modes TEXT,
  avg_delay_days INTEGER,
  return_policy TEXT,
  failure_policy TEXT,
  prices_include_vat BOOLEAN,
  vat_rate NUMERIC,
  vat_exempt BOOLEAN,
  pro_prices JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.partner_code, pp.slug, pp.public_name, pp.logo_url, pp.city, pp.postal_code,
         pp.coverage_area, pp.public_phone, pp.public_email, pp.description, pp.specialties,
         pp.certifications, pp.warranty_terms, pp.shipping_modes, pp.avg_delay_days,
         pp.return_policy, pp.failure_policy, pp.prices_include_vat, pp.vat_rate, pp.vat_exempt,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'label', pi.label,
             'device_family', pi.device_family,
             'pro_price', pi.pro_price,
             'public_price', pi.public_price,
             'delay_days', pi.delay_days,
             'note', pi.note
           ) ORDER BY pi.display_order, pi.label)
           FROM public.partner_price_items pi
           WHERE pi.profile_id = pp.id AND pi.visible_pro = true
         ), '[]'::jsonb)
    FROM public.partner_profiles pp
    JOIN public.shops s ON s.id = pp.shop_id
   WHERE pp.is_published = true
     AND s.partner_directory_opt_in = true
     AND s.id <> COALESCE(public.get_current_user_shop_id(), '00000000-0000-0000-0000-000000000000'::uuid)
     AND (
       _search IS NULL OR _search = '' OR
       pp.public_name ILIKE '%' || _search || '%' OR
       COALESCE(pp.city,'') ILIKE '%' || _search || '%' OR
       COALESCE(pp.postal_code,'') ILIKE '%' || _search || '%' OR
       COALESCE(pp.specialties,'') ILIKE '%' || _search || '%'
     )
   ORDER BY pp.public_name;
$$;

REVOKE ALL ON FUNCTION public.get_pro_partner_directory(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pro_partner_directory(TEXT) TO authenticated;
