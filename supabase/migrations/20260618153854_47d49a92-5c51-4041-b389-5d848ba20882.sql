
-- Step 2: Lock down subscribers table
-- Remove permissive UPDATE and INSERT policies. Only service_role (Stripe webhook / check-subscription edge function) can write.
DROP POLICY IF EXISTS update_own_subscription ON public.subscribers;
DROP POLICY IF EXISTS insert_subscription ON public.subscribers;

-- SELECT policy remains: users can only view their own subscription record.
-- No INSERT/UPDATE/DELETE policies => authenticated/anon clients cannot write.
-- Edge functions using SUPABASE_SERVICE_ROLE_KEY bypass RLS and continue to work.
