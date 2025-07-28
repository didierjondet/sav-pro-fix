-- Enable realtime for SAV cases table
ALTER TABLE public.sav_cases REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sav_cases;

-- Enable realtime for SAV messages table  
ALTER TABLE public.sav_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sav_messages;

-- Enable realtime for SAV status history table
ALTER TABLE public.sav_status_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sav_status_history;