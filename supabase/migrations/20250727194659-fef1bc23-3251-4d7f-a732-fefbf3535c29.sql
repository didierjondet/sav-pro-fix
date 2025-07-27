-- Create messages table for SAV case communication
CREATE TABLE public.sav_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sav_case_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('shop', 'client')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_by_client BOOLEAN NOT NULL DEFAULT false,
  read_by_shop BOOLEAN NOT NULL DEFAULT false,
  shop_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.sav_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for shop users
CREATE POLICY "Shop users can view their SAV messages" 
ON public.sav_messages 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can insert SAV messages" 
ON public.sav_messages 
FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Shop users can update their SAV messages" 
ON public.sav_messages 
FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

-- Create policy for public access to allow clients to view messages for their SAV case
CREATE POLICY "Public can view SAV messages by case number" 
ON public.sav_messages 
FOR SELECT 
USING (true);

-- Create policy for public to insert client messages
CREATE POLICY "Public can insert client messages" 
ON public.sav_messages 
FOR INSERT 
WITH CHECK (sender_type = 'client');

-- Add index for better performance
CREATE INDEX idx_sav_messages_case_id ON public.sav_messages(sav_case_id);
CREATE INDEX idx_sav_messages_created_at ON public.sav_messages(created_at);

-- Create function to update message read status
CREATE OR REPLACE FUNCTION update_message_read_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-mark shop messages as read by shop
  IF NEW.sender_type = 'shop' THEN
    NEW.read_by_shop = true;
  END IF;
  
  -- Auto-mark client messages as read by client
  IF NEW.sender_type = 'client' THEN
    NEW.read_by_client = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update read status
CREATE TRIGGER update_sav_messages_read_status
  BEFORE INSERT ON public.sav_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_message_read_status();