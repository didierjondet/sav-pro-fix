-- Créer la table des tickets de support
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Créer la table des messages de support
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('shop', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_by_shop BOOLEAN NOT NULL DEFAULT false,
  read_by_admin BOOLEAN NOT NULL DEFAULT false
);

-- Activer RLS sur les deux tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour support_tickets
CREATE POLICY "Shop users can view their own support tickets" 
ON public.support_tickets 
FOR SELECT 
USING (shop_id = get_current_user_shop_id());

CREATE POLICY "Shop users can create support tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (shop_id = get_current_user_shop_id() AND created_by = auth.uid());

CREATE POLICY "Shop users can update their own tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (shop_id = get_current_user_shop_id() AND created_by = auth.uid());

CREATE POLICY "Super admins can manage all support tickets" 
ON public.support_tickets 
FOR ALL 
USING (is_super_admin());

-- Créer les politiques RLS pour support_messages
CREATE POLICY "Shop users can view messages from their tickets" 
ON public.support_messages 
FOR SELECT 
USING (ticket_id IN (
  SELECT id FROM public.support_tickets 
  WHERE shop_id = get_current_user_shop_id()
));

CREATE POLICY "Shop users can create messages in their tickets" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  sender_type = 'shop' AND
  ticket_id IN (
    SELECT id FROM public.support_tickets 
    WHERE shop_id = get_current_user_shop_id()
  )
);

CREATE POLICY "Super admins can manage all support messages" 
ON public.support_messages 
FOR ALL 
USING (is_super_admin());

-- Créer les triggers pour updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour marquer automatiquement les messages comme lus par l'expéditeur
CREATE OR REPLACE FUNCTION public.update_support_message_read_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-mark admin messages as read by admin
  IF NEW.sender_type = 'admin' THEN
    NEW.read_by_admin = true;
  END IF;
  
  -- Auto-mark shop messages as read by shop
  IF NEW.sender_type = 'shop' THEN
    NEW.read_by_shop = true;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_support_message_read_status
  BEFORE INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_message_read_status();

-- Activer les mises à jour temps réel
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;