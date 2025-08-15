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