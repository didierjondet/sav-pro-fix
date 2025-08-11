-- Mise à jour temporaire des Price IDs (vous devrez les remplacer par les vrais IDs de votre compte Stripe)
UPDATE subscription_plans 
SET stripe_price_id = NULL 
WHERE name IN ('Premium', 'Enterprise');

-- Ajouter une note dans la description pour rappeler de configurer Stripe
UPDATE subscription_plans 
SET description = CASE 
  WHEN name = 'Premium' THEN 'Plan Premium - Veuillez configurer le Price ID Stripe'
  WHEN name = 'Enterprise' THEN 'Plan Enterprise - Veuillez configurer le Price ID Stripe'
  ELSE description
END
WHERE name IN ('Premium', 'Enterprise');