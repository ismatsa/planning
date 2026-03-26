-- Create devis (quotes) table
CREATE TABLE public.devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_nom text,
  client_tel text,
  marque text,
  modele text,
  annee text,
  vin text,
  notes text,
  statut text NOT NULL DEFAULT 'demande_recue',
  billing_responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_devis_updated_at
  BEFORE UPDATE ON public.devis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Devis responsables pivot
CREATE TABLE public.devis_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(devis_id, user_id)
);

-- Devis intervenants pivot
CREATE TABLE public.devis_intervenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  intervenant_id uuid NOT NULL REFERENCES public.intervenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(devis_id, intervenant_id)
);

-- Devis metiers pivot
CREATE TABLE public.devis_metiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id uuid NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  metier_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(devis_id, metier_id)
);

-- RLS for devis
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read devis" ON public.devis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert devis" ON public.devis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update devis" ON public.devis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete devis" ON public.devis FOR DELETE TO authenticated USING (true);

-- RLS for devis_responsibles
ALTER TABLE public.devis_responsibles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read devis_responsibles" ON public.devis_responsibles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert devis_responsibles" ON public.devis_responsibles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update devis_responsibles" ON public.devis_responsibles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete devis_responsibles" ON public.devis_responsibles FOR DELETE TO authenticated USING (true);

-- RLS for devis_intervenants
ALTER TABLE public.devis_intervenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read devis_intervenants" ON public.devis_intervenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert devis_intervenants" ON public.devis_intervenants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update devis_intervenants" ON public.devis_intervenants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete devis_intervenants" ON public.devis_intervenants FOR DELETE TO authenticated USING (true);

-- RLS for devis_metiers
ALTER TABLE public.devis_metiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read devis_metiers" ON public.devis_metiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert devis_metiers" ON public.devis_metiers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update devis_metiers" ON public.devis_metiers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete devis_metiers" ON public.devis_metiers FOR DELETE TO authenticated USING (true);