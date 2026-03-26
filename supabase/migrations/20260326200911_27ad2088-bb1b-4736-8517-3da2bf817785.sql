CREATE TABLE public.rdv_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rdv_id uuid NOT NULL REFERENCES public.rendez_vous(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  content_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rdv_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rdv_attachments"
ON public.rdv_attachments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert rdv_attachments"
ON public.rdv_attachments FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can delete rdv_attachments"
ON public.rdv_attachments FOR DELETE TO authenticated
USING (true);