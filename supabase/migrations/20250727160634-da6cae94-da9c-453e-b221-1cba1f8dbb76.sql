-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('stock_alert', 'order_needed', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sav_case_id UUID REFERENCES public.sav_cases(id) ON DELETE CASCADE,
  part_id UUID REFERENCES public.parts(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table for managing parts to order
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  part_reference TEXT,
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  sav_case_id UUID REFERENCES public.sav_cases(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('sav_stock_zero', 'quote_needed', 'manual')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  ordered BOOLEAN NOT NULL DEFAULT false,
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Shop users can view their notifications" 
ON public.notifications 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can update their notifications" 
ON public.notifications 
FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can delete their notifications" 
ON public.notifications 
FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- RLS policies for order_items
CREATE POLICY "Shop users can view their order items" 
ON public.order_items 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can insert order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can update their order items" 
ON public.order_items 
FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can delete their order items" 
ON public.order_items 
FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
BEFORE UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();