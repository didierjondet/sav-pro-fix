UPDATE public.inventory_sessions
SET status = 'in_progress', completed_at = NULL, paused_at = NULL, applied_at = NULL
WHERE id = '19870ef1-4a83-47d1-badc-fcce5b7d5692'
  AND status = 'completed'
  AND applied_at IS NULL;