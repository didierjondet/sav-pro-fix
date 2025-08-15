-- Créer un package spécial pour les allocations manuelles avec un tier valide
INSERT INTO sms_packages (
  id,
  name,
  description,
  sms_count,
  price_cents,
  subscription_tier,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Allocation Manuelle',
  'Package spécial pour les allocations manuelles par le super admin',
  0,
  0,
  'free',
  false
) ON CONFLICT (id) DO NOTHING;

-- Insérer 80 SMS achetés pour easycash Agde  
INSERT INTO sms_package_purchases (
  shop_id, 
  package_id, 
  sms_count, 
  price_paid_cents, 
  status
) 
SELECT 
  id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  80,
  0,
  'completed'
FROM shops 
WHERE name ILIKE '%easycash%' AND name ILIKE '%agde%'
ON CONFLICT DO NOTHING;