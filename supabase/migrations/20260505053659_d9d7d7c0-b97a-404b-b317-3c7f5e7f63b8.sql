-- Nettoyer les rappels de sauvegarde envoyés à des boutiques qui n'avaient rien à sauvegarder
-- (créées dans le mois de la notification, ou sans SAV/devis sur le mois concerné)
DELETE FROM public.notifications n
WHERE n.title ILIKE 'Rappel sauvegarde%'
  AND (
    -- Boutique créée dans le même mois (calendrier) que la notification
    EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = n.shop_id
        AND date_trunc('month', s.created_at) >= date_trunc('month', n.created_at)
    )
    OR
    -- Aucune activité (SAV ou devis) dans le mois de la notification
    (
      NOT EXISTS (
        SELECT 1 FROM public.sav_cases sc
        WHERE sc.shop_id = n.shop_id
          AND sc.created_at >= date_trunc('month', n.created_at)
          AND sc.created_at < date_trunc('month', n.created_at) + interval '1 month'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.shop_id = n.shop_id
          AND q.created_at >= date_trunc('month', n.created_at)
          AND q.created_at < date_trunc('month', n.created_at) + interval '1 month'
      )
    )
  );