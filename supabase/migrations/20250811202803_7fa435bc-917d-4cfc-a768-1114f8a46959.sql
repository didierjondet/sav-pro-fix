-- Supprimer tous les SAV et devis annulés/rejetés existants

-- Supprimer les données liées aux SAV annulés
DELETE FROM public.sav_parts 
WHERE sav_case_id IN (
  SELECT id FROM public.sav_cases WHERE status = 'cancelled'
);

DELETE FROM public.sav_messages 
WHERE sav_case_id IN (
  SELECT id FROM public.sav_cases WHERE status = 'cancelled'
);

DELETE FROM public.sav_status_history 
WHERE sav_case_id IN (
  SELECT id FROM public.sav_cases WHERE status = 'cancelled'
);

DELETE FROM public.order_items 
WHERE sav_case_id IN (
  SELECT id FROM public.sav_cases WHERE status = 'cancelled'
);

DELETE FROM public.notifications 
WHERE sav_case_id IN (
  SELECT id FROM public.sav_cases WHERE status = 'cancelled'
);

-- Supprimer les SAV annulés
DELETE FROM public.sav_cases WHERE status = 'cancelled';

-- Supprimer les données liées aux devis rejetés
DELETE FROM public.order_items 
WHERE quote_id IN (
  SELECT id FROM public.quotes WHERE status = 'rejected'
);

DELETE FROM public.notifications 
WHERE id IN (
  SELECT n.id FROM public.notifications n
  JOIN public.quotes q ON q.id::text = n.message
  WHERE q.status = 'rejected' AND n.type = 'quote'
);

-- Supprimer les devis rejetés
DELETE FROM public.quotes WHERE status = 'rejected';