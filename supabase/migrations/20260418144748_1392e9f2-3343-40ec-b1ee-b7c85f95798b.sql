ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_follow_up_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_devis_sent_at ON public.devis(sent_at);