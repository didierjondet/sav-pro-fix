-- Créer le shop HAPICS pour le super admin
INSERT INTO public.shops (
  name, 
  email, 
  phone, 
  address, 
  slug,
  subscription_tier,
  subscription_forced
) VALUES (
  'HAPICS',
  'djondet@gmail.com',
  '+33 4 67 00 00 00',
  'France',
  'hapics',
  'enterprise',
  true
);

-- Récupérer l'ID du shop HAPICS créé et l'assigner au profil super admin
UPDATE public.profiles 
SET shop_id = (SELECT id FROM public.shops WHERE slug = 'hapics')
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'djondet@gmail.com');