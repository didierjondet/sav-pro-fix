-- Mettre à jour le profil pour lui donner le rôle super_admin
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE user_id = '25ab7dac-40c5-4352-b8cc-293208f73da9';