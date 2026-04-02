
CREATE TABLE public.devis_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id UUID NOT NULL REFERENCES public.devis(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'produit',
  name TEXT NOT NULL DEFAULT '',
  oem_reference TEXT,
  internal_reference TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  realisation_user_id UUID,
  commande_user_id UUID,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.devis_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read devis_lines" ON public.devis_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert devis_lines" ON public.devis_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update devis_lines" ON public.devis_lines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete devis_lines" ON public.devis_lines FOR DELETE TO authenticated USING (true);
