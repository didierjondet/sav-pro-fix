-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for quotes
CREATE POLICY "Shop users can view their quotes" 
ON public.quotes 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can insert quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can update quotes" 
ON public.quotes 
FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can delete quotes" 
ON public.quotes 
FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

-- Create function to generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  quote_number TEXT;
BEGIN
  -- Get the next sequence number for today
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.quotes
  WHERE quote_number LIKE 'DEV-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-%';
  
  -- Format: DEV-YYYY-MM-DD-001
  quote_number := 'DEV-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN quote_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set quote number
CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_number_trigger
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_quote_number();

-- Create trigger for updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();