-- Ajouter les colonnes pour les messages d'avis Google personnalisés
ALTER TABLE shops 
ADD COLUMN custom_review_sms_message text,
ADD COLUMN custom_review_chat_message text;

-- Définir des messages par défaut
UPDATE shops 
SET custom_review_sms_message = 'Bonjour {customer_name}, votre dossier de réparation {case_number} a été mis à jour : {status}. Si vous avez été satisfait(e) de notre service, nous vous serions reconnaissants de prendre un moment pour nous laisser un avis : {review_link}. Merci pour votre confiance ! {shop_name}',
    custom_review_chat_message = 'Bonjour {customer_name} ! 👋\n\nVotre réparation est maintenant terminée ! Si vous avez été satisfait(e) de notre service, nous vous serions reconnaissants de prendre un moment pour nous laisser un avis.\n\n⭐ Laisser un avis : {review_link}\n\nVotre retour nous aide à continuer d''améliorer nos services.\n\nMerci pour votre confiance ! 😊\n\nL''équipe {shop_name}'
WHERE custom_review_sms_message IS NULL OR custom_review_chat_message IS NULL;