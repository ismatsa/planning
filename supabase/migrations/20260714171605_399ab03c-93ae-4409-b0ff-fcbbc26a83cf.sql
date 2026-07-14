
ALTER TABLE public.devis_comments
  ALTER COLUMN content DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS attachment_id uuid REFERENCES public.devis_attachments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_devis_comments_attachment ON public.devis_comments(attachment_id);
