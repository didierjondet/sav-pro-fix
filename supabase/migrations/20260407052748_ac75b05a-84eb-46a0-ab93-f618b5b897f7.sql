
INSERT INTO public.shop_role_permissions (shop_id, role, permissions)
SELECT s.id, d.role, d.permissions
FROM public.shops s
CROSS JOIN public.default_role_permissions d
ON CONFLICT (shop_id, role) DO NOTHING;
