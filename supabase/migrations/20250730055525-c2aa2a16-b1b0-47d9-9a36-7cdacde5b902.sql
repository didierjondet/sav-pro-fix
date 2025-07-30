-- Supprimer les policies existantes si elles existent pour les recréer correctement
DROP POLICY IF EXISTS "Shop users can create messages in their tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Shop users can view messages from their tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Super admins can manage all support messages" ON public.support_messages;

-- Policy pour permettre aux magasins de créer des messages dans leurs tickets
CREATE POLICY "Shop users can create messages in their tickets" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'shop' AND 
  sender_id = auth.uid() AND 
  ticket_id IN (
    SELECT id FROM public.support_tickets 
    WHERE shop_id = (
      SELECT shop_id FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy pour permettre aux magasins de voir les messages de leurs tickets
CREATE POLICY "Shop users can view messages from their tickets" 
ON public.support_messages 
FOR SELECT 
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets 
    WHERE shop_id = (
      SELECT shop_id FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy pour permettre aux magasins de mettre à jour le statut de lecture
CREATE POLICY "Shop users can update read status in their tickets" 
ON public.support_messages 
FOR UPDATE 
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets 
    WHERE shop_id = (
      SELECT shop_id FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy pour permettre aux super admins de créer des messages
CREATE POLICY "Super admins can create support messages" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'admin' AND 
  sender_id = auth.uid() AND 
  is_super_admin()
);

-- Policy pour permettre aux super admins de voir tous les messages
CREATE POLICY "Super admins can view all support messages" 
ON public.support_messages 
FOR SELECT 
USING (is_super_admin());

-- Policy pour permettre aux super admins de mettre à jour les messages
CREATE POLICY "Super admins can update all support messages" 
ON public.support_messages 
FOR UPDATE 
USING (is_super_admin());