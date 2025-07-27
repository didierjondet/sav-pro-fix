-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.update_message_read_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;