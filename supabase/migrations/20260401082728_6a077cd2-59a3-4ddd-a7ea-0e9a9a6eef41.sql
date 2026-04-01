
CREATE TABLE public.sav_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sav_case_id uuid REFERENCES public.sav_cases(id) ON DELETE CASCADE NOT NULL,
  shop_id uuid NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  changed_by_user_id uuid,
  changed_by_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sav_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view their audit logs"
  ON public.sav_audit_logs FOR SELECT TO authenticated
  USING (shop_id = get_current_user_shop_id());

CREATE POLICY "Shop members can insert audit logs"
  ON public.sav_audit_logs FOR INSERT TO authenticated
  WITH CHECK (shop_id = get_current_user_shop_id());

CREATE POLICY "Super admins can manage all audit logs"
  ON public.sav_audit_logs FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE INDEX idx_sav_audit_logs_case ON public.sav_audit_logs(sav_case_id);
CREATE INDEX idx_sav_audit_logs_created ON public.sav_audit_logs(created_at DESC);
