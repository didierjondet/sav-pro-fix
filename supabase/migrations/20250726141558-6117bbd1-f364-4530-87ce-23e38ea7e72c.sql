-- Create enum for SAV types
CREATE TYPE public.sav_type AS ENUM ('client', 'internal');

-- Create enum for SAV status
CREATE TYPE public.sav_status AS ENUM ('pending', 'in_progress', 'testing', 'ready', 'delivered', 'cancelled');

-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('super_admin', 'shop_admin', 'technician');

-- Create shops table
CREATE TABLE public.shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  sms_credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table for users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'technician',
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create parts table for inventory
CREATE TABLE public.parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reference TEXT,
  purchase_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create SAV cases table
CREATE TABLE public.sav_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_number TEXT NOT NULL,
  sav_type sav_type NOT NULL,
  status sav_status NOT NULL DEFAULT 'pending',
  device_brand TEXT,
  device_model TEXT,
  device_imei TEXT,
  problem_description TEXT,
  repair_notes TEXT,
  total_cost DECIMAL(10,2) DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create SAV parts usage table
CREATE TABLE public.sav_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sav_case_id UUID REFERENCES public.sav_cases(id) ON DELETE CASCADE,
  part_id UUID REFERENCES public.parts(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2),
  time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create SAV status history table
CREATE TABLE public.sav_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sav_case_id UUID REFERENCES public.sav_cases(id) ON DELETE CASCADE,
  status sav_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sav_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sav_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sav_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shops
CREATE POLICY "Users can view their own shop" ON public.shops
  FOR SELECT USING (
    id IN (
      SELECT shop_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for customers (shop-specific)
CREATE POLICY "Shop users can manage customers" ON public.customers
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for parts (shop-specific)
CREATE POLICY "Shop users can manage parts" ON public.parts
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for SAV cases (shop-specific)
CREATE POLICY "Shop users can manage SAV cases" ON public.sav_cases
  FOR ALL USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for SAV parts
CREATE POLICY "Shop users can manage SAV parts" ON public.sav_parts
  FOR ALL USING (
    sav_case_id IN (
      SELECT id FROM public.sav_cases WHERE shop_id IN (
        SELECT shop_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for SAV status history
CREATE POLICY "Shop users can view SAV status history" ON public.sav_status_history
  FOR ALL USING (
    sav_case_id IN (
      SELECT id FROM public.sav_cases WHERE shop_id IN (
        SELECT shop_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_shop_id ON public.profiles(shop_id);
CREATE INDEX idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX idx_parts_shop_id ON public.parts(shop_id);
CREATE INDEX idx_sav_cases_shop_id ON public.sav_cases(shop_id);
CREATE INDEX idx_sav_cases_status ON public.sav_cases(status);
CREATE INDEX idx_sav_parts_sav_case_id ON public.sav_parts(sav_case_id);
CREATE INDEX idx_sav_status_history_sav_case_id ON public.sav_status_history(sav_case_id);

-- Create function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  case_number TEXT;
BEGIN
  -- Get the next sequence number for today
  SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.sav_cases
  WHERE case_number LIKE TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-%';
  
  -- Format: YYYY-MM-DD-001
  case_number := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN case_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate case numbers
CREATE OR REPLACE FUNCTION set_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := generate_case_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_case_number
  BEFORE INSERT ON public.sav_cases
  FOR EACH ROW
  EXECUTE FUNCTION set_case_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sav_cases_updated_at
  BEFORE UPDATE ON public.sav_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();