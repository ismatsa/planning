
-- Create metiers table
CREATE TABLE public.metiers (
  id text PRIMARY KEY,
  nom text NOT NULL,
  couleur text NOT NULL DEFAULT 'default',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metiers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated can read metiers" ON public.metiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert metiers" ON public.metiers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'administrateur'::app_role));
CREATE POLICY "Admins can update metiers" ON public.metiers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'administrateur'::app_role));
CREATE POLICY "Admins can delete metiers" ON public.metiers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'administrateur'::app_role));

-- Seed with existing data
INSERT INTO public.metiers (id, nom, couleur) VALUES
  ('lavage', 'Lavage', 'lavage'),
  ('reprog', 'Reprogrammation', 'reprog'),
  ('mecanique', 'Mécanique', 'mecanique');

-- Add foreign key from postes to metiers
ALTER TABLE public.postes ADD CONSTRAINT postes_metier_id_fkey FOREIGN KEY (metier_id) REFERENCES public.metiers(id);
