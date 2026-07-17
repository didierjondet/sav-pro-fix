
-- Suppression du statut "Annulé" et des SAV concernés
DELETE FROM public.sav_messages WHERE sav_case_id IN (SELECT id FROM public.sav_cases WHERE status = 'cancelled');
DELETE FROM public.sav_parts WHERE sav_case_id IN (SELECT id FROM public.sav_cases WHERE status = 'cancelled');
DELETE FROM public.sav_status_history WHERE sav_case_id IN (SELECT id FROM public.sav_cases WHERE status = 'cancelled');
DELETE FROM public.sav_audit_logs WHERE sav_case_id IN (SELECT id FROM public.sav_cases WHERE status = 'cancelled');
DELETE FROM public.sav_tracking_visits WHERE sav_case_id IN (SELECT id FROM public.sav_cases WHERE status = 'cancelled');
DELETE FROM public.satisfaction_surveys WHERE sav_case_id IN (SELECT id FROM public.sav_cases WHERE status = 'cancelled');
DELETE FROM public.sav_cases WHERE status = 'cancelled';

-- Retirer le statut "Annulé" du catalogue de tous les magasins
DELETE FROM public.shop_sav_statuses WHERE status_key = 'cancelled';
