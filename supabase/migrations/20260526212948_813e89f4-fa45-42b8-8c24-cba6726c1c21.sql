
-- 1. Table tracked_products
CREATE TABLE IF NOT EXISTS public.tracked_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  device_imei text,
  sku text,
  device_brand text,
  device_model text,
  last_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  sav_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracked_products TO authenticated;
GRANT ALL ON public.tracked_products TO service_role;

ALTER TABLE public.tracked_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members read tracked products"
  ON public.tracked_products FOR SELECT
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members insert tracked products"
  ON public.tracked_products FOR INSERT
  TO authenticated
  WITH CHECK (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members update tracked products"
  ON public.tracked_products FOR UPDATE
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

CREATE POLICY "Shop members delete tracked products"
  ON public.tracked_products FOR DELETE
  TO authenticated
  USING (shop_id = public.get_current_user_shop_id() OR public.is_super_admin());

-- Index unique partiel pour IMEI valide
CREATE UNIQUE INDEX IF NOT EXISTS tracked_products_shop_imei_unique
  ON public.tracked_products (shop_id, device_imei)
  WHERE device_imei IS NOT NULL AND length(device_imei) >= 10;

CREATE INDEX IF NOT EXISTS tracked_products_shop_sku_idx
  ON public.tracked_products (shop_id, sku)
  WHERE sku IS NOT NULL AND sku <> '';

CREATE INDEX IF NOT EXISTS tracked_products_shop_brand_model_idx
  ON public.tracked_products (shop_id, device_brand, device_model);

-- updated_at
CREATE TRIGGER tracked_products_set_updated_at
  BEFORE UPDATE ON public.tracked_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_carousel_items_updated_at();

-- 2. Colonne sur sav_cases
ALTER TABLE public.sav_cases
  ADD COLUMN IF NOT EXISTS tracked_product_id uuid REFERENCES public.tracked_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sav_cases_tracked_product_id_idx
  ON public.sav_cases (tracked_product_id)
  WHERE tracked_product_id IS NOT NULL;

-- 3. Fonction find_or_create
CREATE OR REPLACE FUNCTION public.find_or_create_tracked_product(
  p_shop_id uuid,
  p_imei text,
  p_sku text,
  p_brand text,
  p_model text,
  p_customer_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_shop_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Match par IMEI valide
  IF p_imei IS NOT NULL AND length(p_imei) >= 10 THEN
    SELECT id INTO v_id
    FROM public.tracked_products
    WHERE shop_id = p_shop_id AND device_imei = p_imei
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;

    INSERT INTO public.tracked_products (
      shop_id, device_imei, sku, device_brand, device_model, last_customer_id
    ) VALUES (
      p_shop_id, p_imei, NULLIF(p_sku, ''), NULLIF(p_brand, ''), NULLIF(p_model, ''), p_customer_id
    )
    RETURNING id INTO v_id;

    RETURN v_id;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Trigger sur sav_cases pour rattacher + maj compteur
CREATE OR REPLACE FUNCTION public.sav_cases_attach_tracked_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tracked_product_id IS NULL AND NEW.device_imei IS NOT NULL AND length(NEW.device_imei) >= 10 THEN
    NEW.tracked_product_id := public.find_or_create_tracked_product(
      NEW.shop_id,
      NEW.device_imei,
      NEW.sku,
      NEW.device_brand,
      NEW.device_model,
      NEW.customer_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sav_cases_attach_tracked_product_trg ON public.sav_cases;
CREATE TRIGGER sav_cases_attach_tracked_product_trg
  BEFORE INSERT OR UPDATE OF device_imei, shop_id ON public.sav_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.sav_cases_attach_tracked_product();

-- Maj compteur après insert/update/delete
CREATE OR REPLACE FUNCTION public.sav_cases_refresh_tracked_product_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tp uuid;
  v_new_tp uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_tp := NEW.tracked_product_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_tp := OLD.tracked_product_id;
    v_new_tp := NEW.tracked_product_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_old_tp := OLD.tracked_product_id;
  END IF;

  IF v_old_tp IS NOT NULL AND v_old_tp IS DISTINCT FROM v_new_tp THEN
    UPDATE public.tracked_products tp
    SET sav_count = (SELECT count(*) FROM public.sav_cases WHERE tracked_product_id = tp.id),
        last_seen_at = COALESCE((SELECT max(created_at) FROM public.sav_cases WHERE tracked_product_id = tp.id), tp.last_seen_at)
    WHERE id = v_old_tp;
  END IF;

  IF v_new_tp IS NOT NULL THEN
    UPDATE public.tracked_products tp
    SET sav_count = (SELECT count(*) FROM public.sav_cases WHERE tracked_product_id = tp.id),
        last_seen_at = COALESCE((SELECT max(created_at) FROM public.sav_cases WHERE tracked_product_id = tp.id), now()),
        last_customer_id = COALESCE(
          (SELECT customer_id FROM public.sav_cases
            WHERE tracked_product_id = tp.id AND customer_id IS NOT NULL
            ORDER BY created_at DESC LIMIT 1),
          tp.last_customer_id
        )
    WHERE id = v_new_tp;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sav_cases_refresh_tracked_product_counters_trg ON public.sav_cases;
CREATE TRIGGER sav_cases_refresh_tracked_product_counters_trg
  AFTER INSERT OR UPDATE OF tracked_product_id OR DELETE ON public.sav_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.sav_cases_refresh_tracked_product_counters();

-- 5. Backfill : créer/rattacher les fiches pour les SAV existants avec IMEI
DO $$
DECLARE
  r RECORD;
  v_tp_id uuid;
BEGIN
  FOR r IN
    SELECT id, shop_id, device_imei, sku, device_brand, device_model, customer_id
    FROM public.sav_cases
    WHERE tracked_product_id IS NULL
      AND device_imei IS NOT NULL
      AND length(device_imei) >= 10
    ORDER BY created_at ASC
  LOOP
    v_tp_id := public.find_or_create_tracked_product(
      r.shop_id, r.device_imei, r.sku, r.device_brand, r.device_model, r.customer_id
    );
    IF v_tp_id IS NOT NULL THEN
      UPDATE public.sav_cases SET tracked_product_id = v_tp_id WHERE id = r.id;
    END IF;
  END LOOP;

  -- Recalc compteurs
  UPDATE public.tracked_products tp
  SET sav_count = sub.cnt,
      first_seen_at = sub.first_seen,
      last_seen_at = sub.last_seen
  FROM (
    SELECT tracked_product_id, count(*)::int AS cnt, min(created_at) AS first_seen, max(created_at) AS last_seen
    FROM public.sav_cases
    WHERE tracked_product_id IS NOT NULL
    GROUP BY tracked_product_id
  ) sub
  WHERE tp.id = sub.tracked_product_id;
END $$;
