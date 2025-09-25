-- Drop existing quotes status check constraint
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

-- Add new quotes status check constraint with all valid statuses
ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check 
CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'archived', 'completed'));