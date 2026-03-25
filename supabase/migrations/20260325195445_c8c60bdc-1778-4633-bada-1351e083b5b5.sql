
CREATE TABLE public.intervenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.intervenants ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated
CREATE POLICY "Authenticated can read intervenants"
  ON public.intervenants FOR SELECT
  TO authenticated
  USING (true);

-- Insert: admin only
CREATE POLICY "Admins can insert intervenants"
  ON public.intervenants FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'administrateur'::app_role));

-- Update: admin only
CREATE POLICY "Admins can update intervenants"
  ON public.intervenants FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'administrateur'::app_role));

-- Delete: admin only
CREATE POLICY "Admins can delete intervenants"
  ON public.intervenants FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'administrateur'::app_role));
