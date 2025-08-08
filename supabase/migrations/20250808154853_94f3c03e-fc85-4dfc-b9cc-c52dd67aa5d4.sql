-- Add customer_id to quotes and index/foreign key for client history
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS customer_id uuid NULL;

-- Create foreign key to customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotes_customer_id_fkey'
  ) THEN
    ALTER TABLE public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Index for faster lookups by customer
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
