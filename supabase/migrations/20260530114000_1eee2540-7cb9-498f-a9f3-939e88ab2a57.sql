-- Loaner equipment tables
CREATE TABLE public.loaner_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'autre',
  brand TEXT,
  model TEXT,
  imei TEXT,
  serial_number TEXT,
  color TEXT,
  notes TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loaner_equipment TO authenticated;
GRANT ALL ON public.loaner_equipment TO service_role;

ALTER TABLE public.loaner_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view loaner equipment"
ON public.loaner_equipment FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Shop admins can insert loaner equipment"
ON public.loaner_equipment FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id() AND public.is_shop_admin());

CREATE POLICY "Shop admins can update loaner equipment"
ON public.loaner_equipment FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id() AND public.is_shop_admin());

CREATE POLICY "Shop admins can delete loaner equipment"
ON public.loaner_equipment FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id() AND public.is_shop_admin());

CREATE INDEX idx_loaner_equipment_shop ON public.loaner_equipment(shop_id);
CREATE INDEX idx_loaner_equipment_status ON public.loaner_equipment(shop_id, status);

CREATE TRIGGER update_loaner_equipment_updated_at
BEFORE UPDATE ON public.loaner_equipment
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Loans
CREATE TABLE public.loaner_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.loaner_equipment(id) ON DELETE CASCADE,
  sav_case_id UUID REFERENCES public.sav_cases(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  loaned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expected_return_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  loan_condition TEXT,
  return_condition TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loaner_loans TO authenticated;
GRANT ALL ON public.loaner_loans TO service_role;

ALTER TABLE public.loaner_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view loans"
ON public.loaner_loans FOR SELECT TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Shop members can insert loans"
ON public.loaner_loans FOR INSERT TO authenticated
WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Shop members can update loans"
ON public.loaner_loans FOR UPDATE TO authenticated
USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Shop admins can delete loans"
ON public.loaner_loans FOR DELETE TO authenticated
USING (shop_id = public.get_current_user_shop_id() AND public.is_shop_admin());

CREATE INDEX idx_loaner_loans_shop ON public.loaner_loans(shop_id);
CREATE INDEX idx_loaner_loans_equipment ON public.loaner_loans(equipment_id);
CREATE INDEX idx_loaner_loans_sav ON public.loaner_loans(sav_case_id);
CREATE INDEX idx_loaner_loans_active ON public.loaner_loans(equipment_id) WHERE returned_at IS NULL;

CREATE TRIGGER update_loaner_loans_updated_at
BEFORE UPDATE ON public.loaner_loans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sync equipment status with active loans
CREATE OR REPLACE FUNCTION public.sync_loaner_equipment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.returned_at IS NULL THEN
      UPDATE public.loaner_equipment SET status = 'loaned' WHERE id = NEW.equipment_id AND status = 'available';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
      UPDATE public.loaner_equipment SET status = 'available' WHERE id = NEW.equipment_id AND status = 'loaned';
    ELSIF OLD.returned_at IS NOT NULL AND NEW.returned_at IS NULL THEN
      UPDATE public.loaner_equipment SET status = 'loaned' WHERE id = NEW.equipment_id AND status = 'available';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.returned_at IS NULL THEN
      UPDATE public.loaner_equipment SET status = 'available' WHERE id = OLD.equipment_id AND status = 'loaned';
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_loaner_equipment_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.loaner_loans
FOR EACH ROW EXECUTE FUNCTION public.sync_loaner_equipment_status();