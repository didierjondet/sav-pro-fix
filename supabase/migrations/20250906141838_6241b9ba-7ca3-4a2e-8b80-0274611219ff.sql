-- Drop the existing check constraint
ALTER TABLE public.quotes DROP CONSTRAINT quotes_status_check;

-- Add the updated check constraint including 'sms_accepted'
ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'sent'::text, 'under_negotiation'::text, 'sms_accepted'::text, 'accepted'::text, 'rejected'::text, 'expired'::text]));