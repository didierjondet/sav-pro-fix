-- Allow new users (without profile) to find shops by invite code during onboarding
CREATE POLICY "New users can find shops by invite code"
ON public.shops FOR SELECT TO authenticated
USING (
  NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid())
  AND invite_code IS NOT NULL
);

-- Allow new users to read the shop they just created (for INSERT...RETURNING)
CREATE POLICY "New users can read just-created shop"
ON public.shops FOR SELECT TO authenticated
USING (
  NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid())
  AND created_at > now() - interval '10 seconds'
);