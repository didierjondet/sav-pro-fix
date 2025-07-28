-- Créer un profil super_admin pour l'utilisateur
INSERT INTO public.profiles (user_id, first_name, last_name, role)
VALUES (
  '25ab7dac-40c5-4352-b8cc-293208f73da9',
  'Super',
  'Admin',
  'super_admin'
) ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';