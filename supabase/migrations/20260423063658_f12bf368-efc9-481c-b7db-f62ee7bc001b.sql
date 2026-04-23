-- One-shot data fix: reset all negative stock quantities to 0 for Easycash Agde
UPDATE public.parts
SET quantity = 0,
    updated_at = now()
WHERE shop_id = 'add89e6c-2bff-4799-a062-63cd0a9b33c0'
  AND quantity < 0;