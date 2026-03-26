
-- Comments table for devis feed
CREATE TABLE public.devis_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.devis_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read devis_comments" ON public.devis_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert devis_comments" ON public.devis_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete devis_comments" ON public.devis_comments FOR DELETE TO authenticated USING (true);

-- Attachments table for devis
CREATE TABLE public.devis_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  content_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.devis_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read devis_attachments" ON public.devis_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert devis_attachments" ON public.devis_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete devis_attachments" ON public.devis_attachments FOR DELETE TO authenticated USING (true);

-- Link events to source devis
ALTER TABLE public.rendez_vous ADD COLUMN source_devis_id uuid REFERENCES public.devis(id) ON DELETE SET NULL;

-- Storage bucket for devis attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('devis-attachments', 'devis-attachments', true);

-- Storage RLS
CREATE POLICY "Authenticated can upload devis attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'devis-attachments');
CREATE POLICY "Anyone can read devis attachments" ON storage.objects FOR SELECT USING (bucket_id = 'devis-attachments');
CREATE POLICY "Authenticated can delete devis attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'devis-attachments');
