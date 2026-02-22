
-- Postes table
CREATE TABLE public.postes (
  id TEXT PRIMARY KEY,
  metier_id TEXT NOT NULL CHECK (metier_id IN ('lavage', 'reprog', 'mecanique')),
  nom TEXT NOT NULL,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default postes
INSERT INTO public.postes (id, metier_id, nom, actif) VALUES
  ('lavage-a', 'lavage', 'Poste A', true),
  ('lavage-b', 'lavage', 'Poste B', true),
  ('reprog-banc1', 'reprog', 'Banc 1', true),
  ('meca-pont1', 'mecanique', 'Pont 1', true),
  ('meca-pont2', 'mecanique', 'Pont 2', true),
  ('meca-pont3', 'mecanique', 'Pont 3', true);

-- RLS for postes (authenticated users can read/write)
ALTER TABLE public.postes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read postes" ON public.postes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update postes" ON public.postes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert postes" ON public.postes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete postes" ON public.postes FOR DELETE TO authenticated USING (true);

-- Disponibilite postes table
CREATE TABLE public.disponibilite_postes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poste_id TEXT NOT NULL REFERENCES public.postes(id) ON DELETE CASCADE,
  jour_semaine INTEGER NOT NULL CHECK (jour_semaine BETWEEN 0 AND 6),
  plages JSONB NOT NULL DEFAULT '[]',
  duree_defaut INTEGER NOT NULL DEFAULT 60,
  durees_autorisees JSONB NOT NULL DEFAULT '[30, 60, 90]',
  tampon INTEGER NOT NULL DEFAULT 10,
  UNIQUE (poste_id, jour_semaine)
);

ALTER TABLE public.disponibilite_postes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read dispos" ON public.disponibilite_postes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update dispos" ON public.disponibilite_postes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dispos" ON public.disponibilite_postes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete dispos" ON public.disponibilite_postes FOR DELETE TO authenticated USING (true);

-- Seed default disponibilites (lun-sam for each poste)
INSERT INTO public.disponibilite_postes (poste_id, jour_semaine, plages, duree_defaut, durees_autorisees, tampon)
SELECT
  p.id,
  j.jour,
  '[{"debut":"08:00","fin":"12:00"},{"debut":"13:00","fin":"18:00"}]'::jsonb,
  CASE p.metier_id WHEN 'lavage' THEN 30 WHEN 'reprog' THEN 90 ELSE 60 END,
  CASE p.metier_id WHEN 'lavage' THEN '[30,45,60]'::jsonb WHEN 'reprog' THEN '[60,90,120]'::jsonb ELSE '[30,60,90,120]'::jsonb END,
  10
FROM public.postes p
CROSS JOIN (SELECT unnest(ARRAY[1,2,3,4,5,6]) AS jour) j;

-- Exception disponibilites table
CREATE TABLE public.exception_disponibilites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poste_id TEXT NOT NULL REFERENCES public.postes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ferme BOOLEAN NOT NULL DEFAULT false,
  plages_override JSONB,
  UNIQUE (poste_id, date)
);

ALTER TABLE public.exception_disponibilites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read exceptions" ON public.exception_disponibilites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update exceptions" ON public.exception_disponibilites FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert exceptions" ON public.exception_disponibilites FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete exceptions" ON public.exception_disponibilites FOR DELETE TO authenticated USING (true);

-- Rendez-vous table
CREATE TABLE public.rendez_vous (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poste_id TEXT NOT NULL REFERENCES public.postes(id) ON DELETE CASCADE,
  debut TIMESTAMPTZ NOT NULL,
  fin TIMESTAMPTZ NOT NULL,
  client_nom TEXT,
  client_tel TEXT,
  vehicule TEXT,
  notes TEXT,
  statut TEXT NOT NULL DEFAULT 'prevu' CHECK (statut IN ('prevu', 'confirme', 'annule', 'noshow')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rendez_vous ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read rdvs" ON public.rendez_vous FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rdvs" ON public.rendez_vous FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update rdvs" ON public.rendez_vous FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete rdvs" ON public.rendez_vous FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at on rendez_vous
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rendez_vous_updated_at
BEFORE UPDATE ON public.rendez_vous
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- App settings table (single row)
CREATE TABLE public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  jours_ouvres JSONB NOT NULL DEFAULT '[1,2,3,4,5,6]',
  heure_min TEXT NOT NULL DEFAULT '08:00',
  heure_max TEXT NOT NULL DEFAULT '19:00'
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update settings" ON public.app_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default settings
INSERT INTO public.app_settings (id, jours_ouvres, heure_min, heure_max) VALUES (1, '[1,2,3,4,5,6]', '08:00', '19:00');
