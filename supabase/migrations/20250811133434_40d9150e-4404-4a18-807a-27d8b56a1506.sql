-- Mise à jour temporaire avec des Price IDs de test pour vérifier le fonctionnement
UPDATE subscription_plans 
SET stripe_price_id = CASE 
  WHEN name = 'Premium' THEN 'price_test_premium_39eur' 
  WHEN name = 'Enterprise' THEN 'price_test_enterprise_69eur'
  ELSE stripe_price_id 
END
WHERE name IN ('Premium', 'Enterprise');