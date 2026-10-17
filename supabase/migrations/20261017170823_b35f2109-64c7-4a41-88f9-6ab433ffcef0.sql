CREATE OR REPLACE FUNCTION public.add_default_product_families_to_new_shop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.product_families (shop_id, name, color, display_order)
  VALUES (NEW.id,'Téléphones','#3B82F6',0),(NEW.id,'Tablettes','#06B6D4',1),(NEW.id,'Informatique','#8B5CF6',2),(NEW.id,'Consoles','#10B981',3),(NEW.id,'Autres','#6B7280',4);
  RETURN NEW;
EXCEPTION WHEN others THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS add_default_product_families ON public.shops;
CREATE TRIGGER add_default_product_families AFTER INSERT ON public.shops FOR EACH ROW EXECUTE FUNCTION public.add_default_product_families_to_new_shop();