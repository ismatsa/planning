ALTER TABLE public.postes ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY metier_id ORDER BY created_at, nom) AS rn
  FROM public.postes
)
UPDATE public.postes p SET sort_order = ranked.rn
FROM ranked WHERE ranked.id = p.id;