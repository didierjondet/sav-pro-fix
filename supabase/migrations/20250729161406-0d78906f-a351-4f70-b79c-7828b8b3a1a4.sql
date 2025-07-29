-- Vérifier et corriger les politiques RLS pour donner tous les droits aux super admins

-- Ajouter les politiques manquantes pour permettre aux super admins de tout gérer

-- Pour la table shops - ajout d'une politique pour que les super admins puissent tout gérer
DO $$
BEGIN
  -- Vérifier si la politique existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'shops' 
    AND policyname = 'Super admins can manage all shops'
  ) THEN
    CREATE POLICY "Super admins can manage all shops" 
    ON public.shops 
    FOR ALL 
    TO authenticated 
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
  END IF;
END $$;

-- Pour la table profiles - ajout d'une politique pour que les super admins puissent tout gérer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Super admins can manage all profiles'
  ) THEN
    CREATE POLICY "Super admins can manage all profiles" 
    ON public.profiles 
    FOR ALL 
    TO authenticated 
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
  END IF;
END $$;

-- Pour la table parts - s'assurer que les super admins peuvent tout gérer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'parts' 
    AND policyname = 'Super admins can manage all parts'
  ) THEN
    CREATE POLICY "Super admins can manage all parts" 
    ON public.parts 
    FOR ALL 
    TO authenticated 
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
  END IF;
END $$;

-- Pour la table customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'customers' 
    AND policyname = 'Super admins can manage all customers'
  ) THEN
    CREATE POLICY "Super admins can manage all customers" 
    ON public.customers 
    FOR ALL 
    TO authenticated 
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
  END IF;
END $$;

-- Pour la table sav_cases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sav_cases' 
    AND policyname = 'Super admins can manage all sav_cases'
  ) THEN
    CREATE POLICY "Super admins can manage all sav_cases" 
    ON public.sav_cases 
    FOR ALL 
    TO authenticated 
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
  END IF;
END $$;

-- Pour la table quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'quotes' 
    AND policyname = 'Super admins can manage all quotes'
  ) THEN
    CREATE POLICY "Super admins can manage all quotes" 
    ON public.quotes 
    FOR ALL 
    TO authenticated 
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
  END IF;
END $$;

-- Pour la table order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'order_items' 
    AND policyname = 'Super admins can manage all order_items'
  ) THEN
    CREATE POLICY "Super admins can manage all order_items" 
    ON public.order_items 
    FOR ALL 
    TO authenticated 
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
  END IF;
END $$;

-- Pour la table notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'Super admins can manage all notifications'
  ) THEN
    CREATE POLICY "Super admins can manage all notifications" 
    ON public.notifications 
    FOR ALL 
    TO authenticated 
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
  END IF;
END $$;

-- Pour la table sav_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sav_messages' 
    AND policyname = 'Super admins can manage all sav_messages'
  ) THEN
    CREATE POLICY "Super admins can manage all sav_messages" 
    ON public.sav_messages 
    FOR ALL 
    TO authenticated 
    USING (is_super_admin())
    WITH CHECK (is_super_admin());
  END IF;
END $$;