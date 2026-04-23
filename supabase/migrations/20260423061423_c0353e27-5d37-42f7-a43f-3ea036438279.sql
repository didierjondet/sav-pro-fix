WITH classified AS (
  SELECT p.id,
    CASE
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(batterie|battery)' THEN '552c288d-f0f1-4af9-912a-d6c58908c8b5'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(ecran|écran|lcd|oled|display|vitre tactile)' THEN '52cada0d-90e6-4927-96ad-23af9bec0717'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(vitre arriere|vitre arrière|back cover|back glass|\mdos\M)' THEN '3b095b68-c029-463b-8129-f65608d8ad11'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(chassis|châssis|midframe|\mframe\M)' THEN 'a8d8137b-1b22-4fe2-af1c-c95bf5fb7375'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(camera|caméra|lentille)' THEN '5ec13c1f-d4f9-4da6-a8b6-2c8fe7cf3b67'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(connecteur de charge|charge port|\mdock\M|charging)' THEN '33a02ccf-45fd-4a5f-a061-dc637ecab52d'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(\mnappe|\mflex\M)' THEN 'b08b3428-0ba7-453d-a0d7-396334e2ece5'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(nintendo|\mswitch\M|\mps4\M|\mps5\M|\mxbox\M|joycon|joy-con|manette)' THEN '30d4ae80-3e86-4a74-8042-454a691baf6e'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(\mssd\M|\mnvme\M|m\.2)' THEN '7c11dc20-74dc-43c6-9119-26f151012dcd'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(\mram\M|\mddr3\M|\mddr4\M|\mddr5\M|so-dimm|\mdimm\M)' THEN '994e2e35-22db-4d94-9cae-a9245d5a1111'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(alimentation|chargeur pc|adaptateur secteur|\mpsu\M)' THEN 'd27bea6d-d5e2-423d-b20b-2262b9ee2831'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(clavier pc|pavé tactile|trackpad|inverter)' THEN '326db8d3-ab70-4366-887b-70a6cf581705'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(réparation|reparation|main d''oeuvre|forfait|prestation|diagnostic)' THEN '6d76646f-a42b-4579-b85b-7f2d75b894d1'::uuid
      WHEN lower(p.name || ' ' || COALESCE(p.reference,'')) ~ '(iphone|samsung|xiaomi|huawei|oppo|pixel|smartphone|galaxy|redmi|honor)' THEN '9b3bc295-ef82-4bf1-ba8c-f7cc370fd475'::uuid
      ELSE NULL
    END AS new_category_id
  FROM parts p
  WHERE p.shop_id = 'add89e6c-2bff-4799-a062-63cd0a9b33c0' AND p.category_id IS NULL
)
UPDATE parts p
SET category_id = c.new_category_id, updated_at = now()
FROM classified c
WHERE p.id = c.id AND c.new_category_id IS NOT NULL;