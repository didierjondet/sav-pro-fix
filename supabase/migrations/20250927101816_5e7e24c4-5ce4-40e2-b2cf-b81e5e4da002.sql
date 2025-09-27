-- Add missing twilio_sid column to sms_history table
ALTER TABLE public.sms_history 
ADD COLUMN IF NOT EXISTS twilio_sid text;

-- Add error_message column for failed SMS tracking
ALTER TABLE public.sms_history 
ADD COLUMN IF NOT EXISTS error_message text;