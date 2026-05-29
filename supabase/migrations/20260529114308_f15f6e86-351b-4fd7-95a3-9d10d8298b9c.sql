DROP TABLE IF EXISTS public.shop_suppliers CASCADE;

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  website text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX suppliers_shop_name_unique ON public.suppliers (shop_id, lower(name));
CREATE INDEX suppliers_shop_id_idx ON public.suppliers (shop_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their shop suppliers"
ON public.suppliers FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert suppliers for their shop"
ON public.suppliers FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update their shop suppliers"
ON public.suppliers FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id())
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete their shop suppliers"
ON public.suppliers FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE TRIGGER suppliers_set_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.parts
  ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
CREATE INDEX parts_supplier_id_idx ON public.parts (supplier_id);