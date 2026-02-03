-- Enum pour les types de rendez-vous
CREATE TYPE appointment_type AS ENUM ('deposit', 'pickup', 'diagnostic', 'repair');

-- Enum pour les statuts de rendez-vous
CREATE TYPE appointment_status AS ENUM ('proposed', 'confirmed', 'counter_proposed', 'cancelled', 'completed', 'no_show');

-- Table des horaires d'ouverture du magasin
CREATE TABLE public.shop_working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_open BOOLEAN NOT NULL DEFAULT true,
  break_start TIME,
  break_end TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id, day_of_week)
);

-- Table des rendez-vous
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sav_case_id UUID REFERENCES public.sav_cases(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status appointment_status NOT NULL DEFAULT 'proposed',
  appointment_type appointment_type NOT NULL DEFAULT 'deposit',
  notes TEXT,
  device_info JSONB DEFAULT '{}',
  proposed_by TEXT NOT NULL DEFAULT 'shop' CHECK (proposed_by IN ('shop', 'client')),
  confirmation_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  counter_proposal_datetime TIMESTAMP WITH TIME ZONE,
  counter_proposal_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des créneaux bloqués
CREATE TABLE public.shop_blocked_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes pour les performances
CREATE INDEX idx_appointments_shop_id ON public.appointments(shop_id);
CREATE INDEX idx_appointments_start_datetime ON public.appointments(start_datetime);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_sav_case_id ON public.appointments(sav_case_id);
CREATE INDEX idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX idx_appointments_confirmation_token ON public.appointments(confirmation_token);
CREATE INDEX idx_shop_blocked_slots_shop_id ON public.shop_blocked_slots(shop_id);
CREATE INDEX idx_shop_blocked_slots_datetime ON public.shop_blocked_slots(start_datetime, end_datetime);
CREATE INDEX idx_shop_working_hours_shop_id ON public.shop_working_hours(shop_id);

-- Activer RLS
ALTER TABLE public.shop_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_blocked_slots ENABLE ROW LEVEL SECURITY;

-- RLS pour shop_working_hours
CREATE POLICY "Shop users can view their working hours"
ON public.shop_working_hours FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop admins can manage their working hours"
ON public.shop_working_hours FOR ALL
USING (shop_id = get_current_user_shop_id() AND is_shop_admin())
WITH CHECK (shop_id = get_current_user_shop_id() AND is_shop_admin());

CREATE POLICY "Super admins can manage all working hours"
ON public.shop_working_hours FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- RLS pour appointments
CREATE POLICY "Shop users can view their appointments"
ON public.appointments FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can insert their appointments"
ON public.appointments FOR INSERT
WITH CHECK (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can update their appointments"
ON public.appointments FOR UPDATE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop users can delete their appointments"
ON public.appointments FOR DELETE
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view appointments by token"
ON public.appointments FOR SELECT
USING (confirmation_token IS NOT NULL AND auth.uid() IS NULL);

CREATE POLICY "Public can update appointments by token"
ON public.appointments FOR UPDATE
USING (confirmation_token IS NOT NULL AND auth.uid() IS NULL);

CREATE POLICY "Super admins can manage all appointments"
ON public.appointments FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- RLS pour shop_blocked_slots
CREATE POLICY "Shop users can view their blocked slots"
ON public.shop_blocked_slots FOR SELECT
USING (shop_id = get_current_user_shop_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "Shop admins can manage their blocked slots"
ON public.shop_blocked_slots FOR ALL
USING (shop_id = get_current_user_shop_id() AND is_shop_admin())
WITH CHECK (shop_id = get_current_user_shop_id() AND is_shop_admin());

CREATE POLICY "Super admins can manage all blocked slots"
ON public.shop_blocked_slots FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Trigger pour updated_at
CREATE TRIGGER update_shop_working_hours_updated_at
BEFORE UPDATE ON public.shop_working_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_blocked_slots_updated_at
BEFORE UPDATE ON public.shop_blocked_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();