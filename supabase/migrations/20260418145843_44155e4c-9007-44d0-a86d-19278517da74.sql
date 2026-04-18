UPDATE public.devis
SET sent_at = COALESCE(sent_at, now()),
    statut = 'envoye'
WHERE statut = 'devis_envoye';